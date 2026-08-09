'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase/client'

export default function ConstructionManager() {
  const supabase = createClient()

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Standard Form States
  const [projectName, setProjectName] = useState('')
  const [zoneArea, setZoneArea] = useState('')
  const [workType, setWorkType] = useState('งานโครงสร้าง')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('กำลังดำเนินการ')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editProgress, setEditProgress] = useState(0)

  // Filter State
  const [filterProject, setFilterProject] = useState('')

  // 1. เรียกดูข้อมูลบันทึกงานก่อสร้าง (Read)
  const fetchLogs = async () => {
    setLoading(true)
    let query = supabase.from('construction_logs').select('*').order('created_at', { ascending: false })

    if (filterProject) {
      query = query.ilike('project_name', `%${filterProject}%`)
    }

    const { data, error } = await query
    if (!error && data) setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [filterProject])

  // 2. ฟังก์ชันอัปโหลดไฟล์/รูปภาพเข้า Storage
  const uploadToStorage = async (file: File, folderName: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error } = await supabase.storage
      .from('construction-docs')
      .upload(fileName, file)

    if (error) {
      console.error('Error uploading:', error)
      return null
    }

    const { data } = supabase.storage
      .from('construction-docs')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  // 3. บันทึกรายงานการทำงานใหม่ (Create)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName || !workType) return alert('กรุณากรอกชื่อโครงการและประเภทงาน')

    setLoading(true)
    let photoUrl = null
    let docUrl = null

    // อัปโหลดรูปหน้างานเข้าโฟลเดอร์ site-photos
    if (photoFile) {
      photoUrl = await uploadToStorage(photoFile, 'site-photos')
    }

    // อัปโหลดไฟล์เอกสารเข้าโฟลเดอร์ documents
    if (docFile) {
      docUrl = await uploadToStorage(docFile, 'documents')
    }

    const { error } = await supabase.from('construction_logs').insert([
      {
        project_name: projectName,
        zone_area: zoneArea,
        work_type: workType,
        progress_percent: Number(progress),
        status: status,
        description: description,
        photo_url: photoUrl,
        doc_url: docUrl,
      },
    ])

    if (!error) {
      // รีเซ็ตฟอร์ม
      setProjectName('')
      setZoneArea('')
      setDescription('')
      setProgress(0)
      setPhotoFile(null)
      setDocFile(null)
      fetchLogs()
      alert('บันทึกข้อมูลสำเร็จ')
    } else {
      alert('เกิดข้อผิดพลาดในการบันทึก')
    }
    setLoading(false)
  }

  // 4. แก้ไขสถานะ และ % ความก้าวหน้า (Update)
  const handleUpdate = async (id: number) => {
    const { error } = await supabase
      .from('construction_logs')
      .update({
        status: editStatus,
        progress_percent: Number(editProgress),
      })
      .eq('id', id)

    if (!error) {
      setEditingId(null)
      fetchLogs()
      alert('อัปเดตข้อมูลเรียบร้อย')
    }
  }

  // 5. ลบรายงานบันทึกงาน (Delete)
  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบรายงานบันทึกนี้?')) return

    const { error } = await supabase
      .from('construction_logs')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchLogs()
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        🏗️ ระบบควบคุมการทำงานก่อสร้าง (Construction Daily Log)
      </h1>

      {/* ฟอร์มบันทึกการทำงานประจำวัน */}
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2>➕ บันทึกความก้าวหน้าหน้างาน</h2>
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label><b>ชื่อโครงการ / ไซต์งาน:</b></label>
            <input
              type="text"
              required
              placeholder="เช่น โครงการอาคารสำนักงาน A"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label><b>โซน / พื้นที่ปฏิบัติงาน:</b></label>
            <input
              type="text"
              placeholder="เช่น ชั้น 3 โซนทิศตะวันออก"
              value={zoneArea}
              onChange={(e) => setZoneArea(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label><b>ประเภทงาน:</b></label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="งานโครงสร้าง">งานโครงสร้าง</option>
              <option value="งานสถาปัตยกรรม">งานสถาปัตยกรรม</option>
              <option value="งานระบบไฟฟ้า/ประปา">งานระบบไฟฟ้า/ประปา</option>
              <option value="งานฐานราก/เสาเข็ม">งานฐานราก/เสาเข็ม</option>
              <option value="งานตกแต่งภายใน">งานตกแต่งภายใน</option>
            </select>
          </div>

          <div>
            <label><b>สถานะงาน:</b></label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
              <option value="รอตรวจสอบ/อนุมัติ">รอตรวจสอบ/อนุมัติ</option>
              <option value="พบปัญหาหน้างาน">พบปัญหาหน้างาน</option>
              <option value="เสร็จสิ้นแล้ว">เสร็จสิ้นแล้ว</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label><b>ความก้าวหน้างาน ({progress}%):</b></label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: '100%', marginTop: '5px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label><b>รายละเอียดงาน / ปัญหาที่พบ:</b></label>
            <textarea
              rows={3}
              placeholder="ระบุรายละเอียดงานที่ทำ หรืออุปสรรคหน้างาน..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label><b>📷 รูปถ่ายหน้างาน (Photo):</b></label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              style={{ marginTop: '5px', display: 'block' }}
            />
          </div>

          <div>
            <label><b>📄 ไฟล์แบบแปลน/เอกสาร (PDF/Doc):</b></label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              style={{ marginTop: '5px', display: 'block' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {loading ? 'กำลังบันทึก...' : '💾 บันทึกรายงานหน้างาน'}
            </button>
          </div>
        </form>
      </div>

      {/* ส่วนค้นหาและแสดงรายการข้อมูล */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>📋 รายการบันทึกการทำงานทั้งหมด</h2>
          <input
            type="text"
            placeholder="🔍 ค้นหาตามชื่อโครงการ..."
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{ padding: '8px', width: '250px' }}
          />
        </div>

        {logs.length === 0 ? (
          <p style={{ color: '#888' }}>ยังไม่มีข้อมูลบันทึกการทำงาน</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {logs.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{item.project_name}</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                      📍 โซน: {item.zone_area || '-'} | 🔨 งาน: {item.work_type}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor:
                        item.status === 'เสร็จสิ้นแล้ว' ? '#dcfce7' :
                        item.status === 'พบปัญหาหน้างาน' ? '#fee2e2' : '#fef3c7',
                      color:
                        item.status === 'เสร็จสิ้นแล้ว' ? '#166534' :
                        item.status === 'พบปัญหาหน้างาน' ? '#991b1b' : '#92400e',
                    }}
                  >
                    {item.status}
                  </span>
                </div>

                <p style={{ marginTop: '10px', fontSize: '14px' }}>{item.description}</p>

                {/* Progress Bar */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>ความก้าวหน้า:</span>
                    <b>{item.progress_percent}%</b>
                  </div>
                  <div style={{ width: '100%', background: '#e2e8f0', height: '10px', borderRadius: '5px' }}>
                    <div
                      style={{
                        width: `${item.progress_percent}%`,
                        background: '#3b82f6',
                        height: '100%',
                        borderRadius: '5px',
                      }}
                    />
                  </div>
                </div>

                {/* แสดงรูปถ่ายและไฟล์แนบ */}
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', alignItems: 'center' }}>
                  {item.photo_url && (
                    <a href={item.photo_url} target="_blank" rel="noreferrer">
                      <img
                        src={item.photo_url}
                        alt="รูปหน้างาน"
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #ccc' }}
                      />
                    </a>
                  )}

                  {item.doc_url && (
                    <a
                      href={item.doc_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'underline' }}
                    >
                      📄 ดูเอกสารแนบ/แบบแปลน
                    </a>
                  )}
                </div>

                {/* ปุ่มจัดการ แก้ไข/ลบ */}
                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#94a3b8' }}>
                    📅 บันทึกเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                  </small>

                  {editingId === item.id ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option value="กำลังดำเนินการ">กำลังดำเนินการ</option>
                        <option value="รอตรวจสอบ/อนุมัติ">รอตรวจสอบ/อนุมัติ</option>
                        <option value="พบปัญหาหน้างาน">พบปัญหาหน้างาน</option>
                        <option value="เสร็จสิ้นแล้ว">เสร็จสิ้นแล้ว</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editProgress}
                        onChange={(e) => setEditProgress(Number(e.target.value))}
                        style={{ width: '60px' }}
                      />
                      %
                      <button onClick={() => handleUpdate(item.id)} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>ตกลง</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px' }}>ยกเลิก</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setEditStatus(item.status)
                          setEditProgress(item.progress_percent)
                        }}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        ✏️ ปรับสถานะ/ความก้าวหน้า
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
