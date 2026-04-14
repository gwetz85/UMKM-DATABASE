
"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/i18n"
import { useMemoFirebase, useList, useUser, useDatabase, setDocumentNonBlocking, deleteDocumentNonBlocking, useObject, updateDocumentNonBlocking } from "@/firebase"
import { ref, query } from "firebase/database"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UserPlus, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  UserCheck, 
  Shield, 
  Key, 
  RefreshCcw, 
  Eye, 
  Clock, 
  UserCog,
  ShieldQuestion,
  Phone,
  CreditCard,
  MapPin,
  Building2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function UserManagementPage() {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { toast } = useToast()
  const database = useDatabase()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const adminRef = useMemoFirebase(() => {
    if (!user || !database) return null
    return ref(database, `roles_admin/${user.uid}`)
  }, [user, database])

  const { data: adminRole, isLoading: isAdminLoading } = useObject(adminRef)
  const isAdmin = !!adminRole || (user?.email?.toLowerCase() === 'agus@umkm.id')

  const memoQuery = useMemoFirebase(() => {
    if (!database) return null
    return ref(database, 'system_users')
  }, [database])

  const { data: systemUsers, isLoading } = useList(memoQuery)

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fullName = formData.get("fullName") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string

    if (!fullName || !password || !role) return

    const username = fullName.toLowerCase().trim().replace(/\s+/g, '_')
    const userRef = ref(database, `system_users/${username}`)
    
    setDocumentNonBlocking(userRef, {
      fullName,
      password,
      role,
      uid: null,
      addedAt: new Date().toISOString()
    })

    toast({ 
      title: t('user_registered'), 
      description: t('user_created_success', { name: fullName }) 
    })
    setIsDialogOpen(false)
  }

  const handleUpdateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingUser) return

    const formData = new FormData(e.currentTarget)
    const role = formData.get("role") as string
    const fullName = formData.get("fullName") as string
    const phoneNumber = formData.get("phoneNumber") as string
    const nik = formData.get("nik") as string
    const address = formData.get("address") as string
    
    const userRef = ref(database, `system_users/${editingUser.id}`)

    updateDocumentNonBlocking(userRef, { 
      role,
      fullName,
      phoneNumber,
      nik,
      address
    })

    // Jika diupdate jadi admin, pastikan masuk ke roles_admin kalau UID sudah ada
    if (role === 'admin' && editingUser.uid) {
      const roleRef = ref(database, `roles_admin/${editingUser.uid}`)
      setDocumentNonBlocking(roleRef, { admin: true })
    }

    toast({ title: t('role_updated'), description: t('access_changed_for', { name: editingUser.fullName }) })
    setEditingUser(null)
  }

  const handleResetUID = (id: string, fullName: string) => {
    if (!database) return
    if (confirm(t('confirm_reset_uid', { name: fullName }))) {
      const userRef = ref(database, `system_users/${id}`)
      updateDocumentNonBlocking(userRef, { uid: null })
      toast({ title: t('device_reset'), description: t('uid_removed_for', { name: fullName }) })
    }
  }

  const handleDelete = (id: string, fullName: string, userUid: string | null) => {
    if (userUid === user?.uid) {
      toast({ variant: "destructive", title: t('failed'), description: t('cannot_delete_self') })
      return
    }

    if (confirm(t('confirm_delete_access', { name: fullName }))) {
      deleteDocumentNonBlocking(ref(database, `system_users/${id}`))
      if (userUid) {
        deleteDocumentNonBlocking(ref(database, `roles_admin/${userUid}`))
      }
      toast({ title: t('deleted'), description: t('user_access_revoked') })
    }
  }

  if (!mounted) return null

  if (isAdminLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">{t('access_denied')}</h1>
        <p className="text-muted-foreground max-md">{t('admin_access_only_desc')}</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary font-headline">{t('user_management')}</h1>
          <p className="text-muted-foreground font-medium">{t('user_management_desc')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-lg font-bold">
              <UserPlus className="w-4 h-4 mr-2" /> {t('add_new_user_btn')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAddUser}>
              <DialogHeader>
                <DialogTitle className="text-primary font-black uppercase">{t('new_user_reg_title')}</DialogTitle>
                <CardDescription>{t('new_user_reg_desc')}</CardDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-bold">{t('full_name_username')}</Label>
                  <Input name="fullName" placeholder={t('example_name')} required />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">{t('password')}</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="password" type="password" placeholder={t('create_password')} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">{t('role_position')}</Label>
                  <Select name="role" defaultValue="petugas" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petugas">{t('officer')}</SelectItem>
                      <SelectItem value="koordinator">{t('coordinator')}</SelectItem>
                      <SelectItem value="admin">{t('admin')}</SelectItem>
                      <SelectItem value="monitoring">{t('monitoring')}</SelectItem>
                      <SelectItem value="dinas">{t('dinas')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold">{t('save_user_data_btn')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold uppercase text-[10px]">{t('user_name')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">{t('status_role')}</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">{t('device_security')}</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(systemUsers ? [...systemUsers].reverse() : []).map((u: any) => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="font-bold text-slate-700">
                      <div className="flex flex-col">
                        <span>{u.fullName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{u.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === 'admin' ? (
                        <Badge className="bg-primary hover:bg-primary font-black uppercase text-[9px] gap-1">
                          <Shield className="w-3 h-3" /> {t('admin')}
                        </Badge>
                      ) : u.role === 'monitoring' ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-black uppercase text-[9px] gap-1">
                          <Eye className="w-3 h-3" /> {t('monitoring')}
                        </Badge>
                      ) : u.role === 'koordinator' ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> {t('coordinator')}
                        </Badge>
                      ) : u.role === 'petugas' ? (
                        <Badge variant="secondary" className="text-slate-600 bg-slate-100 font-black uppercase text-[9px] gap-1">
                          <UserCheck className="w-3 h-3" /> {t('officer')}
                        </Badge>
                      ) : u.role === 'dinas' ? (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 font-black uppercase text-[9px] gap-1">
                          <Building2 className="w-3 h-3" /> {t('dinas')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="animate-pulse font-black uppercase text-[9px] gap-1 bg-red-100 text-red-600 border-red-200">
                          <ShieldQuestion className="w-3 h-3" /> {t('pending_activation')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.uid ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase w-fit">{t('locked_to_device')}</span>
                          <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[100px]">{u.uid}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black uppercase border border-amber-200">{t('waiting_for_login')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(u)} className="h-8 text-[10px] font-bold border-primary/20 hover:bg-primary/5 text-primary">
                              <UserCog className="w-3 h-3 mr-1" /> {t('change_role_btn')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <form onSubmit={handleUpdateRole}>
                              <DialogHeader>
                                <DialogTitle className="text-primary font-black uppercase">{t('update_user_access_title')}</DialogTitle>
                                <CardDescription>{t('update_user_access_desc', { name: u.fullName })}</CardDescription>
                              </DialogHeader>
                              <div className="py-6">
                                <div className="grid gap-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="font-bold">{t('full_name')}</Label>
                                    <Input name="fullName" defaultValue={u.fullName} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">{t('phone_number')}</Label>
                                    <Input name="phoneNumber" defaultValue={u.phoneNumber} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">{t('nik')}</Label>
                                    <Input name="nik" defaultValue={u.nik} maxLength={16} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">{t('address')}</Label>
                                    <Textarea name="address" defaultValue={u.address} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="font-bold">{t('role_access')}</Label>
                                    <Select name="role" defaultValue={u.role || "petugas"}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="petugas">{t('officer')}</SelectItem>
                                        <SelectItem value="koordinator">{t('coordinator')}</SelectItem>
                                        <SelectItem value="admin">{t('admin')}</SelectItem>
                                        <SelectItem value="monitoring">{t('monitoring')}</SelectItem>
                                        <SelectItem value="dinas">{t('dinas')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button type="submit" className="w-full font-bold">{t('save_access_btn')}</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        {u.uid && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-amber-600 hover:bg-amber-50 border-amber-200 text-[10px] font-bold"
                            onClick={() => handleResetUID(u.id, u.fullName)}
                            title={t('reset_uid_title')}
                          >
                            <RefreshCcw className="w-3 h-3 mr-1" /> {t('reset_device_btn')}
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id, u.fullName, u.uid)}
                          disabled={u.uid === user?.uid}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!systemUsers || systemUsers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-medium">
                      {t('no_user_data')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
