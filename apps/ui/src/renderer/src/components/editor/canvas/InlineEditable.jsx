import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * InlineEditable - Double-click to edit text inline like Figma
 */
export function InlineEditable({
  value,
  onChange,
  className = "",
  tag = "div",
  placeholder = "Click to edit...",
  disabled = false,
  multiline = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "");
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      if (inputRef.current.select) {
        inputRef.current.select();
      } else if (inputRef.current.setSelectionRange) {
        inputRef.current.setSelectionRange(0, editValue.length);
      }
    }
  }, [isEditing, editValue.length]);

  const startEditing = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
  }, [disabled]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange?.(editValue);
    }
  }, [editValue, onChange, value]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        stopEditing();
      }
      if (e.key === "Escape") {
        setEditValue(value || "");
        setIsEditing(false);
      }
    },
    [multiline, stopEditing, value]
  );

  const handleBlur = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  const Tag = tag;

  // Editing mode
  if (isEditing) {
    const commonProps = {
      ref: inputRef,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: `${className} bg-transparent outline-none ring-2 ring-primary rounded px-1 -mx-1`,
      style: { minWidth: "50px" },
    };

    if (multiline) {
      return (
        <textarea
          {...commonProps}
          rows={Math.max(3, editValue.split("\n").length)}
          className={`${commonProps.className} resize-none w-full`}
        />
      );
    }

    return <input type="text" {...commonProps} />;
  }

  // Display mode
  return (
    <Tag
      className={`${className} cursor-text hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-all ${
        disabled ? "cursor-default" : ""
      }`}
      onDoubleClick={startEditing}
      title={disabled ? "" : "Double-click to edit"}
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
    </Tag>
  );
}

/**
 * EditableText - Simple wrapper for common text editing scenarios
 */
export function EditableText({
  value,
  onChange,
  as = "span",
  className = "",
  ...props
}) {
  return (
    <InlineEditable
      value={value}
      onChange={onChange}
      tag={as}
      className={className}
      {...props}
    />
  );
}

/**
 * EditableHeading - For heading elements
 */
export function EditableHeading({
  value,
  onChange,
  level = 2,
  className = "",
  ...props
}) {
  const headingStyles = {
    1: "text-4xl font-extrabold tracking-tight",
    2: "text-3xl font-semibold tracking-tight",
    3: "text-2xl font-semibold tracking-tight",
    4: "text-xl font-semibold tracking-tight",
  };

  return (
    <InlineEditable
      value={value}
      onChange={onChange}
      tag={`h${level}`}
      className={`${headingStyles[level] || headingStyles[2]} ${className}`}
      {...props}
    />
  );
}

/**
 * EditableParagraph - For paragraph text
 */
export function EditableParagraph({
  value,
  onChange,
  className = "",
  ...props
}) {
  return (
    <InlineEditable
      value={value}
      onChange={onChange}
      tag="p"
      className={`leading-7 ${className}`}
      multiline
      {...props}
    />
  );
}
