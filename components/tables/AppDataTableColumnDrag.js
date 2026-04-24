"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import React, { createContext, useContext } from "react";

/** @typedef {{ active: import("@dnd-kit/core").UniqueIdentifier, over: import("@dnd-kit/core").UniqueIdentifier | undefined, direction?: "left" | "right" }} DragIndexState */

/** @type {React.Context<DragIndexState>} */
export const DragIndexContext = createContext({
  active: -1,
  over: undefined,
  direction: undefined,
});

/**
 * @param {DragIndexState} dragState
 * @param {string} cellId
 * @returns {React.CSSProperties}
 */
export function dragActiveStyle(dragState, cellId) {
  const { active, over } = dragState;
  const id = String(cellId);
  /** @type {React.CSSProperties} */
  let style = {};
  if (active != null && active !== -1 && String(active) === id) {
    style = { backgroundColor: "rgba(0,0,0,0.06)", opacity: 0.85 };
  } else if (over != null && String(over) === id && String(active) !== String(over)) {
    style = { borderInlineStart: "1px dashed rgba(0,0,0,0.35)" };
  }
  return style;
}

/** @param {React.ComponentProps<"th"> & { id?: string }} props */
function PlainTableHeaderCell(props) {
  return <th {...props} />;
}

/** @param {React.ComponentProps<"th"> & { id: string }} props */
function SortableTableHeaderCellInner(props) {
  const { id, children, style, className, colSpan, rowSpan, scope, title, ...rest } = props;
  const dragState = useContext(DragIndexContext);

  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: String(id) });

  /** @type {React.CSSProperties} */
  const styleMerged = {
    ...style,
    position: "relative",
    cursor: "move",
    ...(isDragging ? { zIndex: 9999, userSelect: "none" } : {}),
    ...dragActiveStyle(dragState, String(id)),
  };

  return (
    <th
      ref={setNodeRef}
      colSpan={colSpan}
      rowSpan={rowSpan}
      scope={scope}
      title={typeof title === "string" ? title : undefined}
      className={className}
      style={styleMerged}
      {...rest}
      {...attributes}
      {...listeners}
    >
      {children}
    </th>
  );
}

/** @param {React.ComponentProps<"th"> & { id?: string }} props */
export function SortableTableHeaderCell(props) {
  if (props.id == null || props.id === "") {
    return <PlainTableHeaderCell {...props} />;
  }
  return <SortableTableHeaderCellInner {...props} id={String(props.id)} />;
}

/** @param {React.ComponentProps<"td"> & { id?: string }} props */
function PlainTableBodyCell(props) {
  return <td {...props} />;
}

/** @param {React.ComponentProps<"td"> & { id: string }} props */
function SortableTableBodyCellInner(props) {
  const dragState = useContext(DragIndexContext);
  const { id, style, children, className, colSpan, rowSpan, ...rest } = props;
  return (
    <td
      {...rest}
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={className}
      style={{ ...style, ...dragActiveStyle(dragState, String(id)) }}
    >
      {children}
    </td>
  );
}

/** @param {React.ComponentProps<"td"> & { id?: string }} props */
export function SortableTableBodyCell(props) {
  if (props.id == null || props.id === "") {
    return <PlainTableBodyCell {...props} />;
  }
  return <SortableTableBodyCellInner {...props} id={String(props.id)} />;
}

/**
 * @param {{
 *   children: React.ReactNode,
 *   sortableIds: import("@dnd-kit/core").UniqueIdentifier[],
 *   dragIndex: DragIndexState,
 *   onDragEnd: (event: import("@dnd-kit/core").DragEndEvent) => void,
 *   onDragOver: (event: import("@dnd-kit/core").DragOverEvent) => void,
 *   overlayNode: React.ReactNode,
 * }} props
 */
export function ColumnDragShell({ children, sortableIds, dragIndex, onDragEnd, onDragOver, overlayNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 1 },
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      collisionDetection={closestCenter}
    >
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <DragIndexContext.Provider value={dragIndex}>{children}</DragIndexContext.Provider>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {/*
          DragOverlay mounts children inside a positioned <div>; <th> is invalid there and
          breaks hydration. Use a div styled like a header chip (ant.design demo used <th>).
        */}
        <div
          role="presentation"
          style={{
            boxSizing: "border-box",
            padding: "12px 16px",
            background: "var(--ant-color-fill-secondary, rgba(0,0,0,0.06))",
            whiteSpace: "nowrap",
            fontWeight: 500,
            borderRadius: 2,
            border: "1px solid var(--ant-color-border-secondary, rgba(0,0,0,0.12))",
          }}
        >
          {overlayNode}
        </div>
      </DragOverlay>
    </DndContext>
  );
}
