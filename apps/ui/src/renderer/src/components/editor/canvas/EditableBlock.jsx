import React, { useState, useRef, useCallback } from "react";
import { Plus, Trash2, GripVertical, Type, MousePointerClick, ChevronDown } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

/**
 * EditableText - Click to edit text inline
 */
export function EditableText({
  value,
  onChange,
  placeholder = "Click to edit...",
  className = "",
  as: Tag = "span",
  multiline = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef(null);

  const startEditing = useCallback((e) => {
    e.stopPropagation();
    setEditValue(value || "");
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [value]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange?.(editValue);
    }
  }, [editValue, onChange, value]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      stopEditing();
    }
    if (e.key === "Escape") {
      setEditValue(value || "");
      setIsEditing(false);
    }
  }, [multiline, stopEditing, value]);

  if (isEditing) {
    const props = {
      ref: inputRef,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onBlur: stopEditing,
      onKeyDown: handleKeyDown,
      onClick: (e) => e.stopPropagation(),
      className: `${className} bg-transparent border-none outline-none ring-2 ring-primary rounded px-1 w-full`,
      placeholder,
    };

    if (multiline) {
      return <textarea {...props} rows={3} className={`${props.className} resize-none`} />;
    }
    return <input type="text" {...props} />;
  }

  return (
    <Tag
      className={`${className} cursor-text hover:bg-primary/10 rounded px-1 -mx-1 transition-colors inline-block min-w-[20px]`}
      onClick={startEditing}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
    </Tag>
  );
}

/**
 * EditableButton - Editable button with click to edit label
 */
export function EditableButton({ 
  label, 
  href, 
  variant = "default",
  size = "default",
  onLabelChange, 
  onHrefChange,
  onVariantChange,
  onDelete,
  isSelected,
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [showVariants, setShowVariants] = useState(false);
  const inputRef = useRef(null);

  const startEditing = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setEditLabel(label);
    setIsEditingLabel(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const stopEditing = () => {
    setIsEditingLabel(false);
    if (editLabel !== label) {
      onLabelChange?.(editLabel);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      stopEditing();
    }
    if (e.key === "Escape") {
      setEditLabel(label);
      setIsEditingLabel(false);
    }
  };

  const variants = ["default", "secondary", "outline", "ghost", "destructive"];

  if (isEditingLabel) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editLabel}
        onChange={(e) => setEditLabel(e.target.value)}
        onBlur={stopEditing}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="px-4 py-2 rounded-md border-2 border-primary bg-background text-sm font-medium outline-none"
        style={{ minWidth: 80 }}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-1 group relative">
      <Button
        variant={variant}
        size={size}
        onClick={startEditing}
        className="cursor-text"
      >
        {label || "Button"}
      </Button>
      
      {/* Quick actions on hover when selected */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-md p-0.5 shadow-sm z-10">
          {/* Variant selector */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-1.5 text-[10px] gap-0.5"
              onClick={(e) => { e.stopPropagation(); setShowVariants(!showVariants); }}
            >
              {variant}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {showVariants && (
              <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg z-20 py-1 min-w-[100px]">
                {variants.map((v) => (
                  <button
                    key={v}
                    className={`w-full text-left px-2 py-1 text-xs hover:bg-muted ${variant === v ? "bg-muted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVariantChange?.(v);
                      setShowVariants(false);
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * EditableButtonGroup - Group of buttons with add/remove capability
 */
export function EditableButtonGroup({
  buttons = [],
  onChange,
  isSelected,
  align = "center",
}) {
  const handleAddButton = (e) => {
    e?.stopPropagation();
    const newButton = {
      id: `btn-${Date.now()}`,
      label: "New Button",
      href: "#",
      variant: buttons.length === 0 ? "default" : "outline",
    };
    onChange?.([...buttons, newButton]);
  };

  const handleUpdateButton = (index, updates) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    onChange?.(newButtons);
  };

  const handleDeleteButton = (index) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    onChange?.(newButtons);
  };

  const justifyClass = align === "center" ? "justify-center" : align === "left" ? "justify-start" : "justify-end";

  return (
    <div className={`flex items-center ${justifyClass} gap-3 flex-wrap`}>
      {buttons.map((btn, index) => (
        <EditableButton
          key={btn.id || index}
          label={btn.label}
          href={btn.href}
          variant={btn.variant}
          size="lg"
          isSelected={isSelected}
          onLabelChange={(label) => handleUpdateButton(index, { label })}
          onHrefChange={(href) => handleUpdateButton(index, { href })}
          onVariantChange={(variant) => handleUpdateButton(index, { variant })}
          onDelete={buttons.length > 1 ? () => handleDeleteButton(index) : undefined}
        />
      ))}
      
      {/* Add button - only visible when selected */}
      {isSelected && (
        <Button
          variant="outline"
          size="lg"
          className="h-10 gap-1 border-dashed hover:border-solid"
          onClick={handleAddButton}
        >
          <Plus className="h-4 w-4" />
          Add Button
        </Button>
      )}
    </div>
  );
}

/**
 * EditableList - Editable list of items (for features, FAQ, etc.)
 */
export function EditableList({
  items = [],
  onChange,
  isSelected,
  renderItem,
  itemTemplate = { title: "New Item", description: "" },
  addLabel = "Add Item",
}) {
  const handleAddItem = (e) => {
    e?.stopPropagation();
    const newItem = { ...itemTemplate, id: `item-${Date.now()}` };
    onChange?.([...items, newItem]);
  };

  const handleUpdateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange?.(newItems);
  };

  const handleDeleteItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange?.(newItems);
  };

  const handleMoveItem = (index, direction) => {
    const newItems = [...items];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange?.(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id || index} className="group relative">
          {/* Item controls */}
          {isSelected && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => handleMoveItem(index, -1)}
                disabled={index === 0}
              >
                <GripVertical className="h-3 w-3 rotate-90" />
              </Button>
            </div>
          )}
          
          {/* Render the item */}
          {renderItem ? (
            renderItem(item, index, (updates) => handleUpdateItem(index, updates), () => handleDeleteItem(index))
          ) : (
            <div className="flex items-start gap-2">
              <EditableText
                value={item.title}
                onChange={(title) => handleUpdateItem(index, { title })}
                className="font-medium"
                placeholder="Title"
              />
              {isSelected && items.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleDeleteItem(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Add item button */}
      {isSelected && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 gap-1 border-dashed hover:border-solid"
          onClick={handleAddItem}
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * AddContentButton - Floating button to add new content sections
 */
export function AddContentButton({ onAdd, options = [], position = "bottom" }) {
  const [showMenu, setShowMenu] = useState(false);
  
  const defaultOptions = [
    { id: "heading", label: "Heading", icon: Type },
    { id: "paragraph", label: "Paragraph", icon: Type },
    { id: "button", label: "Button", icon: MousePointerClick },
  ];

  const menuOptions = options.length > 0 ? options : defaultOptions;

  return (
    <div className={`flex justify-center ${position === "bottom" ? "mt-4" : "mb-4"} relative`}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 border-dashed hover:border-solid bg-background"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Plus className="h-3 w-3" />
        Add Content
        <ChevronDown className="h-3 w-3" />
      </Button>
      
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-full mt-1 bg-popover border rounded-md shadow-lg z-50 py-1 min-w-[140px]">
            {menuOptions.map((option) => {
              const Icon = option.icon || Type;
              return (
                <button
                  key={option.id}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"
                  onClick={() => {
                    onAdd?.(option.id);
                    setShowMenu(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
