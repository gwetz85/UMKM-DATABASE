"use client"

import { useMemoFirebase, useList, useUser, useDatabase } from "@/firebase"
import { ref, query } from "firebase/database"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Loader2
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function BusinessListPage() {
  const { user } = useUser()
  const database = useDatabase()

  const memoQuery = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `users/${user.uid}/businessActors`)
  }, [user, database])

  const { data: rawBusinesses, isLoading } = useList(memoQuery)
  const businesses = rawBusinesses ? [...rawBusinesses].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)) : []

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">Pelaku Usaha</h1>
          <p className="text-muted-foreground">Kelola basis data pelaku usaha Anda melalui Firebase Realtime Database.</p>
        </div>
        <a href="/business/new">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Baru
          </Button>
        </a>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-muted">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama usaha, kota, atau tipe..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon" title="Filter">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-slate-100">
                {businesses?.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {item.registrationNumber || '-'}
                          </span>
                        </div>
                        <div className="font-bold text-primary text-base leading-tight">
                          {item.companyName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Pemilik: {item.ownerName || '-'}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Opsi</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[10px]">
                        {item.businessType}
                      </Badge>
                      <span className="text-slate-500 font-medium">
                        {item.city || '-'}
                      </span>
                    </div>
                  </div>
                ))}
                {(!businesses || businesses.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Tidak ada data pelaku usaha ditemukan.
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold">Nama Perusahaan</TableHead>
                      <TableHead className="font-semibold">Tipe Bisnis</TableHead>
                      <TableHead className="font-semibold">Lokasi</TableHead>
                      <TableHead className="font-semibold">NIB / No Reg</TableHead>
                      <TableHead className="text-right font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses?.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-primary">{item.companyName}</span>
                            <span className="text-xs text-muted-foreground">{item.ownerName || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none">
                            {item.businessType}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.city}</TableCell>
                        <TableCell className="font-mono text-xs">{item.registrationNumber}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>Opsi</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!businesses || businesses.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Tidak ada data pelaku usaha ditemukan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
