<?php
// Penegakan hak akses di sisi server. Matriksnya dibangkitkan dari
// assets/js/rbac.js (lihat rbac-matrix.php) sehingga selalu identik.
require_once __DIR__ . '/rbac-matrix.php';

function rbacLevel(?string $role, string $moduleId): string {
  if($role === null || !isset(ROLE_ACCESS[$role])) return '-';
  return ROLE_ACCESS[$role][$moduleId] ?? '-';
}
function rbacCanRead(?string $role, string $m): bool    { return rbacLevel($role, $m) !== '-'; }
function rbacCanWrite(?string $role, string $m): bool    { $l = rbacLevel($role, $m); return $l === 'RW' || $l === 'A'; }
function rbacCanApprove(?string $role, string $m): bool  { return rbacLevel($role, $m) === 'A'; }

function rbacAllowedModules(?string $role): array {
  return array_values(array_filter(RBAC_MODULES, fn($m) => rbacCanRead($role, $m)));
}

// Hentikan permintaan bila peran tidak berwenang. Dipakai di setiap jalur
// yang membaca atau mengubah data — bukan sebagai pelengkap pemeriksaan UI,
// melainkan sebagai satu-satunya pemeriksaan yang menentukan.
function requireRead(string $moduleId): void {
  $role = currentUser()['role'] ?? null;
  if(!rbacCanRead($role, $moduleId)){
    auditLog('denied', $moduleId, null, 'baca ditolak');
    fail(403, 'Peran Anda tidak memiliki akses baca pada modul ini.');
  }
}
function requireWrite(string $moduleId): void {
  $role = currentUser()['role'] ?? null;
  if(!rbacCanWrite($role, $moduleId)){
    auditLog('denied', $moduleId, null, 'ubah ditolak');
    fail(403, 'Peran Anda tidak memiliki kewenangan mengubah data pada modul ini.');
  }
}
function requireApprove(string $moduleId): void {
  $role = currentUser()['role'] ?? null;
  if(!rbacCanApprove($role, $moduleId)){
    auditLog('denied', $moduleId, null, 'persetujuan ditolak');
    fail(403, 'Peran Anda tidak memiliki kewenangan menyetujui pada modul ini.');
  }
}
