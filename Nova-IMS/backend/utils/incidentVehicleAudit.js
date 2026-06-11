function fmtAuditValue(val) {
  if (val == null || val === '') return '(vacío)';
  return String(val);
}

function normalizeVehicle(v) {
  const rawPlate = String(v?.plate || '').trim();
  return {
    plate: rawPlate.toUpperCase(),
    plateKey: rawPlate.toUpperCase().replaceAll(/[^A-Z0-9]/g, ''),
    role: String(v?.role || '').trim(),
    make: String(v?.make || '').trim(),
    model: String(v?.model || '').trim(),
    color: String(v?.color || '').trim(),
    details: String(v?.details || '').trim(),
  };
}

const VEHICLE_AUDIT_TRACKED = [
  ['role', 'Rol'],
  ['make', 'Marca'],
  ['model', 'Modelo'],
  ['color', 'Color'],
  ['details', 'Detalle'],
];

function resolveAfterVehicleIndex(before, afterList, usedAfter, sameCount, index) {
  if (sameCount && !usedAfter.has(index)) {
    return index;
  }
  const byPlate = afterList.findIndex(
    (vehicle, idx) => !usedAfter.has(idx) && vehicle.plateKey === before.plateKey,
  );
  if (byPlate >= 0) return byPlate;
  return afterList.findIndex((_, idx) => !usedAfter.has(idx));
}

function appendVehiclePlateChange(details, before, after) {
  if (before.plateKey === after.plateKey) return;
  details.push({
    field: `Placa (${before.plate})`,
    old: fmtAuditValue(before.plate),
    new: fmtAuditValue(after.plate),
  });
}

function appendVehicleTrackedFieldChanges(details, before, after, ref) {
  for (const [key, label] of VEHICLE_AUDIT_TRACKED) {
    const oldVal = fmtAuditValue(before[key]);
    const newVal = fmtAuditValue(after[key]);
    if (oldVal !== newVal) {
      details.push({ field: `${label} (${ref})`, old: oldVal, new: newVal });
    }
  }
}

function appendNewVehiclesAudit(details, afterList, usedAfter) {
  for (let j = 0; j < afterList.length; j++) {
    if (usedAfter.has(j)) continue;
    details.push({
      field: `Vehículo (${afterList[j].plate})`,
      old: '(no existía)',
      new: 'Agregado',
    });
  }
}

function appendRemovedVehicleAudit(details, before) {
  details.push({
    field: `Vehículo (${before.plate})`,
    old: 'Existente',
    new: '(eliminado)',
  });
}

function auditSingleBeforeVehicle(details, before, afterList, usedAfter, sameCount, index) {
  const matchedIdx = resolveAfterVehicleIndex(before, afterList, usedAfter, sameCount, index);
  if (matchedIdx < 0) {
    appendRemovedVehicleAudit(details, before);
    return;
  }
  const after = afterList[matchedIdx];
  usedAfter.add(matchedIdx);
  const ref = after.plate || before.plate || `#${index + 1}`;
  appendVehiclePlateChange(details, before, after);
  appendVehicleTrackedFieldChanges(details, before, after, ref);
}

function appendVehicleAuditDetails(details, beforeVehicles = [], afterVehicles = []) {
  const beforeList = (beforeVehicles || []).map(normalizeVehicle).filter((v) => v.plateKey);
  const afterList = (afterVehicles || []).map(normalizeVehicle).filter((v) => v.plateKey);
  const usedAfter = new Set();
  const sameCount = beforeList.length === afterList.length && beforeList.length > 0;

  for (let i = 0; i < beforeList.length; i++) {
    auditSingleBeforeVehicle(details, beforeList[i], afterList, usedAfter, sameCount, i);
  }
  appendNewVehiclesAudit(details, afterList, usedAfter);
}

function vehiclesAuditFingerprint(list) {
  return (list || [])
    .map(normalizeVehicle)
    .filter((v) => v.plateKey)
    .map((v) => `${v.plateKey}|${v.role}|${v.make}|${v.model}|${v.color}|${v.details}`)
    .join(';');
}

module.exports = {
  appendVehicleAuditDetails,
  vehiclesAuditFingerprint,
};
