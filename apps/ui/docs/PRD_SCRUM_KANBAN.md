# 📋 PRD: Next-Gen Scrum & Kanban MCP Integration

## 1. Product Vision

To revolutionize agile project management by seamlessly bridging the gap between project planning tools and the developer's IDE. By leveraging the Model Context Protocol (MCP), the Next-Gen Scrum board becomes a living participant in the development lifecycle, enabling AI agents to act as proactive Scrum team members.

## 2. Product Overview

The Next-Gen Scrum/Kanban system is a desktop-first application built with Electron and React. It provides a visual board for managing tasks while exposing its state and operations through an MCP server. This allows AI agents in IDEs (Cursor, VS Code, Windsurf, Claude Code) to read, update, and manage the board in real-time based on natural language commands from the developer.

## 3. Target Audience

- **Developers**: Who want to manage their tasks without leaving their IDE.
- **Scrum Masters / Project Managers**: Who need a visual overview of team progress and AI-assisted sprint planning.
- **Teams using AI-augmented IDEs**: Who want their AI agents to have full context of their project management state.

## 4. Key Features

### 4.1. Visual Scrum/Kanban Board

- **Dynamic Columns**: Customizable statuses (Backlog, Ready for Dev, In Progress, Review, Done).
- **Rich Card Editor**: Support for titles, descriptions, story points, priority levels, and epics.
- **Drag-and-Drop**: Intuitive interface for moving tasks between statuses.
- **Epic Management**: High-level grouping of related stories.

### 4.2. Conflict Prevention & Locking

- **Real-time Locking**: Prevents multiple users (or agents) from editing the same card simultaneously.
- **Auto-release**: Locks expire after a set period of inactivity.

### 4.3. Agent Specializations (BMAD v6)

- **Strategic Roles**: Analyst, Product Manager, UX Designer.
- **Technical Roles**: Architect, Developer, Test Engineer.
- **Coordination Roles**: Scrum Master, BMAD Master.
- **Support Roles**: Tech Writer, Quick Flow (Solo).

### 4.4. Phase-Based Workflow

The product follows the BMAD v6 4-phase structure:

1.  **Analysis**: Research and product brief creation.
2.  **Planning**: PRD and UX design (PRD is a mandatory output).
3.  **Solutioning**: Architecture design and story creation.
4.  **Implementation**: Sprint execution, development, and code review.

### 4.5. Multi-IDE MCP Integration

- **Universal Connection**: Supports connection via stdio or SSE.
- **IDE-Specific Rules**: Tailored configurations for Cursor (.mdc), Claude Code (.md), Windsurf (.yaml), VS Code (.json), Trae (.md), Cline (.clinerules), and GitHub Copilot.
- **Natural Language Control**: Developers can say "Start working on the login story" and the agent will move the card automatically.

### 4.6. MCP Toolset

Agents have access to a comprehensive set of tools for board management:

- **State Management**: `scrum_get_state`, `scrum_set_state`.
- **Board & List Operations**: `scrum_create_board`, `scrum_delete_board`, `scrum_add_list`, `scrum_rename_list`, `scrum_delete_list`.
- **Story & Epic Operations**: `scrum_add_card`, `scrum_update_card`, `scrum_delete_card`, `scrum_move_card`, `scrum_complete_story`, `scrum_create_epic`, `scrum_update_epic`.
- **Query Tools**: `scrum_get_stories_by_status`, `scrum_get_next_story`, `scrum_get_story_by_id`.
- **Concurrency Control**: `scrum_acquire_lock`, `scrum_release_lock`.

## 5. Technical Architecture

### 5.1. Tech Stack

- **Frontend**: React 18, Tailwind CSS, Shadcn/UI.
- **State Management**: Zustand (with local storage persistence and SSE sync).
- **Desktop Wrapper**: Electron with IPC bridge for system-level operations.
- **Communication**: Model Context Protocol (MCP) over SSE (Server-Sent Events) and stdio.

### 5.2. Data Flow

1.  **UI Updates**: User interacts with the React board.
2.  **Store Persistence**: Zustand updates local state and triggers API calls to the MCP server.
3.  **MCP Server**: Manages the master state, handles locks, and broadcasts updates via SSE.
4.  **IDE Agents**: Connect to the MCP server, receive real-time updates, and execute tools to modify state.

## 6. User Stories

| ID  | Role         | Requirement                                                                     | Goal                                                                 |
| --- | ------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| US1 | Developer    | As a developer, I want to ask my IDE agent "What's next?"                       | To quickly pick up the highest priority task without switching apps. |
| US2 | Developer    | As a developer, I want my agent to move a story to "Review" when I finish a PR. | To keep the board updated with zero manual effort.                   |
| US3 | Scrum Master | As a Scrum Master, I want to see a burndown chart in the dashboard.             | To track sprint progress and identify bottlenecks early.             |
| US4 | Team Member  | As a team member, I want to be notified if someone else is editing a card.      | To avoid conflicting updates and lost work.                          |

## 7. Future Roadmap

- **Sprint Planning Wizard**: AI-assisted capacity planning and story point estimation.
- **Advanced Analytics**: Automated velocity tracking and sprint reports.
- **GitHub/GitLab Sync**: Automatic card movement based on PR status and commit messages.
- **Voice Commands**: Hands-free board management during standups.
