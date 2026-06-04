export interface ProjectData {
  id: string; // unique identifier
  bln: string; // Bulan (e.g., FEBRUARI, MARET, APRIL, MEI, JUNI, JULI, dst)
  jenis: string; // Jenis (e.g., RECOVERY, SWAKELOLA, NODE B, HEM, MTEL, JPP)
  pekerjaan: string; // Pekerjaan (e.g., DKU, TA, MHR)
  boq: string; // BOQ (e.g., OSP LAMA, TA-TIF, OSP BARU, MTEL LAMA, MTEL BARU)
  status: string; // Status (e.g., BERKAS DONE, PENGAJUAN REKON, PEMBERKASAN, PLAN)
  namaLop: string; // Nama LOP
  material: number; // Matrial (numeric)
  jasa: number; // Jasa (numeric)
  sitac: number; // SITAC (numeric)
  jumlah: number; // Jumlah (material + jasa + sitac)
  panjar60: number; // Panjar 60% (numeric)
  panjarSitac: number; // Panjar SITAC (numeric)
  pelunasan15: number; // Pelunasan 15% (numeric)
  pendapatanMaharani: number; // Pendapatan Maharani 25% (numeric)
  tanggalPanjar: string; // Tanggal Panjar (format DD/MM/YYYY atau string)
}

export interface DashboardStats {
  totalProjects: number;
  totalBOQ: number;
  totalMaterial: number;
  totalJasa: number;
  totalSitac: number;
  totalPanjar60: number;
  totalPanjarSitac: number;
  totalPelunasan15: number;
  totalPendapatanMaharani: number;
}
