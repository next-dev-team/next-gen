import * as React from "react"
import {
  Plus,
  Trash2,
  Pencil,
  X,
  GripVertical,
  LayoutGrid,
} from "lucide-react"

import { cn } from "../lib/utils"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const nowIso = () => new Date().toISOString()

const defaultState = () => {
  const boardId = createId()
  const listNames = ["Backlog", "Todo", "In Progress", "Done"]
  return {
    version: 1,
    activeBoardId: boardId,
    boards: [
      {
        id: boardId,
        name: "Team Board",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lists: listNames.map((name) => ({
          id: createId(),
          name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          cards: [],
        })),
      },
    ],
  }
}

const safeParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const getLocalState = () => {
  const raw = localStorage.getItem("scrum-state")
  const parsed = raw ? safeParse(raw) : null
  if (!parsed?.boards?.length) return defaultState()
  return parsed
}

const setLocalState = (state) => {
  localStorage.setItem("scrum-state", JSON.stringify(state))
  return state
}

const getPersistedState = async () => {
  if (window.electronAPI?.getScrumState) {
    const state = await window.electronAPI.getScrumState()
    if (state?.boards?.length) return state
    const seed = defaultState()
    await window.electronAPI.setScrumState(seed)
    return seed
  }
  return getLocalState()
}

const setPersistedState = async (state) => {
  if (window.electronAPI?.setScrumState) {
    return window.electronAPI.setScrumState(state)
  }
  return setLocalState(state)
}

const findBoard = (state, boardId) =>
  state.boards.find((b) => b.id === boardId) || null

const updateBoardInState = (state, boardId, updater) => {
  const boards = state.boards.map((b) => {
    if (b.id !== boardId) return b
    const next = updater(b)
    return { ...next, updatedAt: nowIso() }
  })
  return { ...state, boards }
}

const moveCardInBoard = ({ board, cardId, fromListId, toListId, toIndex }) => {
  let movingCard = null
  const listsAfterRemove = board.lists.map((list) => {
    if (list.id !== fromListId) return list
    const nextCards = list.cards.filter((c) => {
      if (c.id !== cardId) return true
      movingCard = c
      return false
    })
    return { ...list, cards: nextCards, updatedAt: nowIso() }
  })

  if (!movingCard) return board
  const normalizedToIndex = Math.max(0, Number.isFinite(toIndex) ? toIndex : 0)
  const listsAfterInsert = listsAfterRemove.map((list) => {
    if (list.id !== toListId) return list
    const nextCards = [...list.cards]
    const safeIndex = Math.min(normalizedToIndex, nextCards.length)
    nextCards.splice(safeIndex, 0, { ...movingCard, updatedAt: nowIso() })
    return { ...list, cards: nextCards, updatedAt: nowIso() }
  })

  return { ...board, lists: listsAfterInsert, updatedAt: nowIso() }
}

const CardEditorDialog = ({ open, onOpenChange, initial, onSave, onDelete }) => {
  const [title, setTitle] = React.useState(initial?.title || "")
  const [description, setDescription] = React.useState(initial?.description || "")
  const [assignee, setAssignee] = React.useState(initial?.assignee || "")
  const [points, setPoints] = React.useState(
    typeof initial?.points === "number" ? String(initial.points) : ""
  )
  const [labels, setLabels] = React.useState(
    Array.isArray(initial?.labels) ? initial.labels.join(", ") : ""
  )

  React.useEffect(() => {
    setTitle(initial?.title || "")
    setDescription(initial?.description || "")
    setAssignee(initial?.assignee || "")
    setPoints(typeof initial?.points === "number" ? String(initial.points) : "")
    setLabels(Array.isArray(initial?.labels) ? initial.labels.join(", ") : "")
  }, [initial])

  const canSave = title.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Card" : "New Card"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Assignee</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Story Points</Label>
            <Input
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>
          <div className="grid gap-2">
            <Label>Labels</Label>
            <Input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="comma separated"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial?.id ? (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => onDelete?.()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              const parsedPoints = points.trim() === "" ? null : Number(points)
              const nextPoints = Number.isFinite(parsedPoints) ? parsedPoints : null
              const nextLabels = labels
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean)

              onSave({
                title: title.trim(),
                description: description.trim(),
                assignee: assignee.trim(),
                points: nextPoints,
                labels: nextLabels,
              })
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ScrumBoardView() {
  const [state, setState] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [activeBoardId, setActiveBoardId] = React.useState(null)
  const [newBoardName, setNewBoardName] = React.useState("")
  const [isNewBoardOpen, setIsNewBoardOpen] = React.useState(false)

  const [cardDialogOpen, setCardDialogOpen] = React.useState(false)
  const [cardDialogContext, setCardDialogContext] = React.useState(null)

  const [dragState, setDragState] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const loaded = await getPersistedState()
      if (cancelled) return
      setState(loaded)
      setActiveBoardId(loaded.activeBoardId || loaded.boards?.[0]?.id || null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = React.useCallback(async (next) => {
    const saved = await setPersistedState(next)
    setState(saved)
    setActiveBoardId(saved.activeBoardId || saved.boards?.[0]?.id || null)
  }, [])

  const mutate = React.useCallback(
    async (updater) => {
      setState((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        void persist(next)
        return next
      })
    },
    [persist]
  )

  const activeId = activeBoardId || state?.activeBoardId || null
  const activeBoard = state ? findBoard(state, activeId) : null

  const openNewCard = (listId) => {
    setCardDialogContext({ boardId: activeId, listId, card: null })
    setCardDialogOpen(true)
  }

  const openEditCard = (listId, card) => {
    setCardDialogContext({ boardId: activeId, listId, card })
    setCardDialogOpen(true)
  }

  const addList = async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) => ({
        ...board,
        lists: [
          ...board.lists,
          {
            id: createId(),
            name: trimmed,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            cards: [],
          },
        ],
      }))
    )
  }

  const renameList = async (listId, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) => ({
        ...board,
        lists: board.lists.map((l) =>
          l.id === listId ? { ...l, name: trimmed, updatedAt: nowIso() } : l
        ),
      }))
    )
  }

  const deleteList = async (listId) => {
    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) => ({
        ...board,
        lists: board.lists.filter((l) => l.id !== listId),
      }))
    )
  }

  const upsertCard = async ({ listId, cardId, patch }) => {
    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) => ({
        ...board,
        lists: board.lists.map((list) => {
          if (list.id !== listId) return list
          if (!cardId) {
            const card = {
              id: createId(),
              title: patch.title,
              description: patch.description || "",
              assignee: patch.assignee || "",
              points: typeof patch.points === "number" ? patch.points : null,
              labels: Array.isArray(patch.labels) ? patch.labels : [],
              createdAt: nowIso(),
              updatedAt: nowIso(),
            }
            return { ...list, cards: [card, ...list.cards], updatedAt: nowIso() }
          }
          return {
            ...list,
            cards: list.cards.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    ...patch,
                    updatedAt: nowIso(),
                  }
                : c
            ),
            updatedAt: nowIso(),
          }
        }),
      }))
    )
  }

  const deleteCard = async ({ listId, cardId }) => {
    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) => ({
        ...board,
        lists: board.lists.map((l) =>
          l.id === listId
            ? { ...l, cards: l.cards.filter((c) => c.id !== cardId), updatedAt: nowIso() }
            : l
        ),
      }))
    )
  }

  const createBoard = async () => {
    const name = newBoardName.trim()
    if (!name) return
    const boardId = createId()
    const next = {
      ...state,
      activeBoardId: boardId,
      boards: [
        ...state.boards,
        {
          id: boardId,
          name,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          lists: [
            { id: createId(), name: "Backlog", createdAt: nowIso(), updatedAt: nowIso(), cards: [] },
            { id: createId(), name: "Todo", createdAt: nowIso(), updatedAt: nowIso(), cards: [] },
            { id: createId(), name: "In Progress", createdAt: nowIso(), updatedAt: nowIso(), cards: [] },
            { id: createId(), name: "Done", createdAt: nowIso(), updatedAt: nowIso(), cards: [] },
          ],
        },
      ],
    }
    setNewBoardName("")
    setIsNewBoardOpen(false)
    await persist(next)
  }

  const deleteBoard = async (boardId) => {
    await mutate((prev) => {
      const remaining = prev.boards.filter((b) => b.id !== boardId)
      const nextActive = prev.activeBoardId === boardId ? remaining[0]?.id || null : prev.activeBoardId
      const next = { ...prev, boards: remaining, activeBoardId: nextActive }
      if (!next.boards.length) return defaultState()
      return next
    })
  }

  const onDragStartCard = (e, listId, cardId) => {
    const payload = { type: "scrum-card", listId, cardId }
    e.dataTransfer.setData("application/json", JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "move"
    setDragState({ listId, cardId })
  }

  const onDropCardToList = async (e, toListId, toIndex) => {
    e.preventDefault()
    const payload = safeParse(e.dataTransfer.getData("application/json"))
    if (!payload || payload.type !== "scrum-card") return
    const fromListId = payload.listId
    const cardId = payload.cardId
    if (!fromListId || !cardId) return

    await mutate((prev) =>
      updateBoardInState(prev, activeId, (board) =>
        moveCardInBoard({ board, cardId, fromListId, toListId, toIndex })
      )
    )

    setDragState(null)
  }

  if (loading || !state) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="h-6 w-36 bg-muted rounded mb-3" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6 min-h-[520px] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Scrum Board</h3>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="w-full sm:w-[240px]">
            <Select
              value={activeId || ""}
              onValueChange={async (value) => {
                setActiveBoardId(value)
                await persist({ ...state, activeBoardId: value })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {state.boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isNewBoardOpen} onOpenChange={setIsNewBoardOpen}>
            <Button type="button" variant="outline" onClick={() => setIsNewBoardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Board
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Board</DialogTitle>
              </DialogHeader>
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewBoardOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={createBoard} disabled={!newBoardName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {activeBoard ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteBoard(activeBoard.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Board
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-max flex gap-4 items-start pb-2">
          {activeBoard?.lists?.map((list) => (
            <ListColumn
              key={list.id}
              list={list}
              dragState={dragState}
              onAddCard={() => openNewCard(list.id)}
              onEditCard={(card) => openEditCard(list.id, card)}
              onRename={(name) => renameList(list.id, name)}
              onDelete={() => deleteList(list.id)}
              onDragStartCard={(e, cardId) => onDragStartCard(e, list.id, cardId)}
              onDropToIndex={(e, index) => onDropCardToList(e, list.id, index)}
              onDropToEnd={(e) => onDropCardToList(e, list.id, list.cards.length)}
            />
          ))}

          <AddListColumn onAdd={addList} />
        </div>
      </div>

      <CardEditorDialog
        open={cardDialogOpen}
        onOpenChange={(open) => {
          setCardDialogOpen(open)
          if (!open) setCardDialogContext(null)
        }}
        initial={cardDialogContext?.card}
        onSave={async (patch) => {
          const listId = cardDialogContext?.listId
          if (!listId) return
          await upsertCard({
            listId,
            cardId: cardDialogContext?.card?.id || null,
            patch,
          })
          setCardDialogOpen(false)
          setCardDialogContext(null)
        }}
        onDelete={async () => {
          const listId = cardDialogContext?.listId
          const cardId = cardDialogContext?.card?.id
          if (!listId || !cardId) return
          await deleteCard({ listId, cardId })
          setCardDialogOpen(false)
          setCardDialogContext(null)
        }}
      />
    </div>
  )
}

const ListColumn = ({
  list,
  dragState,
  onAddCard,
  onEditCard,
  onRename,
  onDelete,
  onDragStartCard,
  onDropToIndex,
  onDropToEnd,
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [nameDraft, setNameDraft] = React.useState(list.name)
  const isDragFromHere = dragState?.listId === list.id

  React.useEffect(() => {
    setNameDraft(list.name)
  }, [list.name])

  return (
    <div
      className="w-[320px] rounded-xl border bg-background"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropToEnd}
    >
      <div className="px-3 py-3 border-b flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {isEditingName ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              className="h-8"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(nameDraft)
                  setIsEditingName(false)
                }
                if (e.key === "Escape") {
                  setNameDraft(list.name)
                  setIsEditingName(false)
                }
              }}
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                onRename(nameDraft)
                setIsEditingName(false)
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setNameDraft(list.name)
                setIsEditingName(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex-1 text-left font-medium text-foreground truncate"
            onClick={() => setIsEditingName(true)}
          >
            {list.name}
          </button>
        )}

        <Badge variant="secondary" className="text-xs">
          {list.cards.length}
        </Badge>

        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onAddCard}>
          <Plus className="h-4 w-4" />
        </Button>

        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {list.cards.map((card, index) => (
          <React.Fragment key={card.id}>
            <DropZone
              isActive={!isDragFromHere}
              onDrop={(e) => onDropToIndex(e, index)}
            />
            <ScrumCard
              card={card}
              onClick={() => onEditCard(card)}
              onDragStart={(e) => onDragStartCard(e, card.id)}
            />
          </React.Fragment>
        ))}
        <DropZone isActive={!isDragFromHere} onDrop={(e) => onDropToIndex(e, list.cards.length)} />
      </div>
    </div>
  )
}

const DropZone = ({ isActive, onDrop }) => {
  const [over, setOver] = React.useState(false)
  return (
    <div
      className={cn(
        "h-2 rounded transition-colors",
        isActive ? "hover:bg-primary/20" : "opacity-40",
        over ? "bg-primary/30" : "bg-transparent"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        if (!isActive) return
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        onDrop(e)
      }}
    />
  )
}

const ScrumCard = ({ card, onClick, onDragStart }) => {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      className="cursor-grab active:cursor-grabbing hover:bg-accent/40 transition-colors"
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={onClick}
          >
            <div className="font-medium text-sm text-foreground leading-snug">
              {card.title}
            </div>
            {card.description ? (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {card.description}
              </div>
            ) : null}
          </button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={onClick}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {(card.assignee || card.points || (card.labels && card.labels.length)) ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {typeof card.points === "number" ? (
              <Badge variant="secondary" className="text-[10px]">
                {card.points} pt
              </Badge>
            ) : null}
            {card.assignee ? (
              <Badge variant="outline" className="text-[10px]">
                {card.assignee}
              </Badge>
            ) : null}
            {Array.isArray(card.labels)
              ? card.labels.slice(0, 3).map((label) => (
                  <Badge key={label} className="text-[10px]">
                    {label}
                  </Badge>
                ))
              : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

const AddListColumn = ({ onAdd }) => {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")

  return (
    <div className="w-[320px]">
      {open ? (
        <div className="rounded-xl border bg-background p-3 flex flex-col gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onAdd(name)
                setName("")
                setOpen(false)
              }
              if (e.key === "Escape") {
                setName("")
                setOpen(false)
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1"
              disabled={!name.trim()}
              onClick={() => {
                onAdd(name)
                setName("")
                setOpen(false)
              }}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setName("")
                setOpen(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add list
        </Button>
      )}
    </div>
  )
}
