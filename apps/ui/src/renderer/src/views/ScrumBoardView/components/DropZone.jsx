/**
 * DropZone Component
 *
 * Visual drop target for drag and drop operations.
 */

import * as React from "react";
import { cn } from "../../../lib/utils";

export default function DropZone({ isActive, onDrop }) {
  const [over, setOver] = React.useState(false);

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn(
        "rounded-lg transition-all duration-200 ease-out relative w-full",
        isActive
          ? over
            ? "h-24 bg-primary/15 border-2 border-dashed border-primary/40 shadow-sm my-2"
            : "h-6 bg-primary/5 hover:h-24 hover:bg-primary/10 my-1"
          : "h-0 opacity-0 overflow-hidden m-0",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isActive) return;
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        onDrop(e);
      }}
    >
      {isActive && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-[10px] font-medium uppercase tracking-wider transition-opacity duration-200",
            over ? "text-primary/60 opacity-100" : "opacity-0",
          )}
        >
          {over ? "Drop here" : ""}
        </div>
      )}
    </div>
  );
}
