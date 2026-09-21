import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto bg-white dark:bg-slate-900/95 rounded-xl border border-slate-200/80 dark:border-slate-800">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-base bg-white dark:bg-slate-900/95 text-slate-800 dark:text-slate-100", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("bg-transparent text-slate-800 dark:text-slate-100 [&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 font-medium text-slate-900 dark:text-slate-100 [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors bg-white dark:bg-slate-900/95 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 even:bg-slate-50/40 dark:even:bg-slate-800/30 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800 border-b border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-100",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-14 px-6 text-left align-middle font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest text-sm bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-6 align-middle font-medium text-base text-slate-700 dark:text-slate-200 bg-transparent [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-slate-500 dark:text-slate-400", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
