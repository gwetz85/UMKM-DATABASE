"use client"

import React from "react"
import Link from "next/link"
import {
  ShieldCheck,
  ClipboardCheck,
  FileCheck,
  ListChecks,
  CreditCard,
  FileText,
  CheckCircle2,
  Ban,
  ShieldAlert,
  Clock,
  Users,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getActorCurrentMenu, ActorMenuIconType } from "@/lib/actor-menu-status"
import { BusinessActor } from "@/app/lib/types"

interface ActorMenuBadgeProps {
  actor: BusinessActor | any
  className?: string
  compact?: boolean
  showStage?: boolean
  asLink?: boolean
  showExternalIcon?: boolean
}

export function ActorMenuBadge({
  actor,
  className,
  compact = false,
  showStage = false,
  asLink = false,
  showExternalIcon = false,
}: ActorMenuBadgeProps) {
  try {
    const menuInfo = getActorCurrentMenu(actor)

    const renderIcon = (type: ActorMenuIconType) => {
      const iconClass = compact ? "w-2.5 h-2.5 shrink-0" : "w-3 h-3 shrink-0"
      switch (type) {
        case "survey":
          return <ClipboardCheck className={iconClass} />
        case "berkas":
          return <FileCheck className={iconClass} />
        case "hasil":
          return <ListChecks className={iconClass} />
        case "rekening":
          return <CreditCard className={iconClass} />
        case "lpj":
          return <FileText className={iconClass} />
        case "finish":
          return <CheckCircle2 className={iconClass} />
        case "rejected":
          return <Ban className={iconClass} />
        case "blacklist":
          return <ShieldAlert className={iconClass} />
        case "hold":
          return <Clock className={iconClass} />
        case "data_actor":
          return <Users className={iconClass} />
        default:
          return <ShieldCheck className={iconClass} />
      }
    }

    const tooltipText = `Posisi Berkas Saat Ini: ${menuInfo.displayLabel}\nTahapan: ${menuInfo.stageLabel}\nDetail: ${menuInfo.description}${asLink ? "\n(Klik untuk menuju menu)" : ""}`

    const badgeContent = (
      <>
        {renderIcon(menuInfo.iconType)}
        <span className="uppercase tracking-tight font-extrabold whitespace-nowrap shrink-0">
          {menuInfo.displayLabel}
        </span>
        {showStage && menuInfo.stageLabel && (
          <span className="opacity-80 font-bold text-[9px] border-l pl-1.5 ml-0.5 border-current truncate max-w-[200px] sm:max-w-none">
            {menuInfo.stageLabel}
          </span>
        )}
        {asLink && showExternalIcon && (
          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
        )}
      </>
    )

    const commonClasses = cn(
      "inline-flex items-center gap-1.5 font-black rounded-xl border shadow-xs leading-tight transition-all select-none max-w-full backdrop-blur-md",
      compact ? "text-[9px] px-2 py-0.5 shrink-0" : "text-[10px] px-2.5 py-1",
      asLink ? "hover:scale-[1.02] hover:brightness-95 dark:hover:brightness-110 cursor-pointer active:scale-95" : "",
      menuInfo.badgeColorClass,
      className
    )

    if (asLink) {
      return (
        <Link
          href={menuInfo.menuPath}
          onClick={(e) => e.stopPropagation()}
          className={commonClasses}
          title={tooltipText}
        >
          {badgeContent}
        </Link>
      )
    }

    return (
      <span
        onClick={(e) => e.stopPropagation()}
        className={commonClasses}
        title={tooltipText}
      >
        {badgeContent}
      </span>
    )
  } catch (err) {
    console.error("Error rendering ActorMenuBadge:", err)
    return null
  }
}
