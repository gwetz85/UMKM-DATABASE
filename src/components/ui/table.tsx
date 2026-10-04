import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-white/10 shadow-lg shadow-slate-200/30 dark:shadow-none">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-base text-slate-800 dark:text-slate-100", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-white/10", className)} {...props} />
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
      "border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md font-bold text-slate-900 dark:text-slate-100 [&>tr]:last:border-b-0",
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
      "transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/60 even:bg-slate-50/40 dark:even:bg-slate-800/30 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800 border-b border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-100",
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
      "h-12 px-5 text-left align-middle font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs md:text-sm bg-slate-100/70 dark:bg-slate-800/70 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 [&:has([role=checkbox])]:pr-0",
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
    className={cn("p-4 sm:p-5 align-middle font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 bg-transparent [&:has([role=checkbox])]:pr-0", className)}
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
