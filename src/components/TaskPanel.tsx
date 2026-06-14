import { useState } from "react";
import type { FormEvent } from "react";
import type { Task } from "@/types";

interface TaskPanelProps {
  tasks: Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskPanel({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskPanelProps): React.JSX.Element {
  const [title, setTitle] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    onAddTask(title);
    setTitle("");
  };

  return (
    <section className="panel task-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Focus queue</span>
          <h2>Current tasks</h2>
        </div>
        <span className="panel-count">{tasks.filter((task) => !task.completed).length}</span>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          maxLength={100}
          placeholder="What needs your attention?"
          aria-label="New task"
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" aria-label="Add task" title="Add task">
          <span aria-hidden="true">+</span>
        </button>
      </form>

      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <span className="empty-mark" aria-hidden="true" />
            <p>Your focus queue is clear.</p>
            <span>Add one small, concrete task.</span>
          </div>
        ) : (
          tasks.map((task) => (
            <div className={task.completed ? "task-row is-complete" : "task-row"} key={task.id}>
              <button
                className="task-check"
                type="button"
                aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
                aria-pressed={task.completed}
                onClick={() => onToggleTask(task.id)}
              >
                <span aria-hidden="true" />
              </button>
              <span className="task-title">{task.title}</span>
              <button
                className="task-delete"
                type="button"
                aria-label={`Delete ${task.title}`}
                title="Delete task"
                onClick={() => onDeleteTask(task.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
