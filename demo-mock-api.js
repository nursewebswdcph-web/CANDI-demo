/**
 * ==========================================================================
 * DEMO MOCK API  —  IPD Nurse Workbench (โหมดสาธิต/จำลอง)
 * ==========================================================================
 * ไฟล์นี้จำลอง Backend (Google Apps Script) ทั้งหมดไว้ในฝั่ง Browser
 * โดย "ดัก" การเรียก fetch() ทุกครั้งที่ปลายทางเป็น API_URL ของแอป แล้วตอบกลับ
 * ด้วยข้อมูลจำลอง (mock data) แทน จึงไม่มีการเรียก API จริงออกไปอินเทอร์เน็ตเลย
 * -> เปิดเว็บได้เร็ว ใช้แสดงในบูธนวัตกรรมได้แม้ไม่มีสัญญาณเน็ต
 *
 * วิธีใช้: แทรก <script src="demo-mock-api.js"></script> ไว้ "ก่อน"
 * <script src="app.js"> และ <script src="script.js"> ใน index.html
 *
 * เข้าสู่ระบบด้วย   username: admin   password: 1234
 * ==========================================================================
 */
(function () {
    'use strict';

    // ---- ปรับตรงนี้ได้ถ้าต้องการเปลี่ยนรหัสผ่านโหมดสาธิต ----
    const DEMO_USERNAME = 'admin';
    const DEMO_PASSWORD = '1234';
    const DEMO_TOKEN = 'DEMO-SESSION-TOKEN';
    const STORAGE_KEY = 'candi_demo_db_v1';
    const NETWORK_DELAY_MS = 220; // หน่วงเล็กน้อยให้รู้สึกเหมือนมีการโหลดข้อมูลจริง

    // ให้คำถามของผู้ช่วย AI (CANDI) "หลุด" ออกไปเรียกเซิร์ฟเวอร์ AI จริง (ต้องมีเน็ตที่บูธ)
    // ส่วนข้อมูลผู้ป่วย/บันทึกต่างๆ ยังคงเป็นข้อมูลจำลองทั้งหมดเหมือนเดิม ไม่เกี่ยวข้องกัน
    // -> ตั้งเป็น false ได้ถ้าต้องการปิด CANDI กลับไปใช้ข้อความสำรองเหมือนเดิม
    const ALLOW_REAL_CANDI_CHAT = true;

    // ==========================================================================
    // 1. ข้อมูลผู้ป่วยจำลอง (หลากหลายเคสให้ผู้เข้าชมทดลองใช้งาน)
    // ==========================================================================
    const DEMO_WARD = 'หอผู้ป่วยสาธิต (DEMO)';

    const SEED_PATIENTS = [
        {
            an: '68000101', hn: 'HN000101', name: 'นายสมชาย ใจดี (ผู้ป่วยตัวอย่าง)',
            bed: 'A1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Ischemic Stroke with Right Hemiplegia', age: '78 ปี', sex: 'ชาย',
            admitDate: daysAgo(6), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 65, latestMaas: 2, latestBraden: 11, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000102', hn: 'HN000102', name: 'พระสมพงษ์ ธมฺมชโย (พระอาพาธ)',
            bed: 'สงฆ์-1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Community-Acquired Pneumonia, Diabetes Mellitus type 2', age: '65 ปี', sex: 'ชาย',
            admitDate: daysAgo(3), religion: 'พุทธ (พระภิกษุ)', rightType: 'ข้าราชการ',
            latestMorse: 30, latestMaas: 3, latestBraden: 17, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000103', hn: 'HN000103', name: 'นางสาวพิมพ์ใจ รักสุขภาพ',
            bed: 'A3', ward: DEMO_WARD, dept: 'ศัลยกรรม', doctor: 'พญ.นภัสวรรณ ศัลยแพทย์',
            diagnosis: 'Post-op Appendectomy Day 1 (Post-Laparotomy)', age: '29 ปี', sex: 'หญิง',
            admitDate: daysAgo(1), religion: 'พุทธ', rightType: 'ประกันสังคม',
            latestMorse: 15, latestMaas: 4, latestBraden: 20, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000104', hn: 'HN000104', name: 'นายบุญมี เท้าบวม',
            bed: 'A4', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Diabetic Foot Ulcer, Uncontrolled DM', age: '61 ปี', sex: 'ชาย',
            admitDate: daysAgo(9), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 40, latestMaas: 3, latestBraden: 13, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000105', hn: 'HN000105', name: 'ด.ญ.น้ำฝน แข็งแรงดี',
            bed: 'เด็ก-1', ward: DEMO_WARD, dept: 'กุมารเวชกรรม', doctor: 'พญ.สุกัญญา กุมารแพทย์',
            diagnosis: 'Acute Gastroenteritis with Mild Dehydration', age: '6 ปี', sex: 'หญิง',
            admitDate: daysAgo(2), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: '', latestMaas: '', latestBraden: '', latestBradenDate: '',
        },
        {
            an: '68000106', hn: 'HN000106', name: 'นางประไพ ระยะท้าย',
            bed: 'A6', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Metastatic Breast Cancer, Palliative Care', age: '70 ปี', sex: 'หญิง',
            admitDate: daysAgo(14), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 55, latestMaas: 1, latestBraden: 9, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000107', hn: 'HN000107', name: 'นายเดชา ขาหัก',
            bed: 'A7', ward: DEMO_WARD, dept: 'ศัลยกรรมกระดูก', doctor: 'นพ.วิชัย กระดูกและข้อ',
            diagnosis: 'Closed Fracture Right Femur, รอผ่าตัด ORIF', age: '45 ปี', sex: 'ชาย',
            admitDate: daysAgo(1), religion: 'พุทธ', rightType: 'ประกันสังคม',
            latestMorse: 70, latestMaas: 3, latestBraden: 15, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000108', hn: 'HN000108', name: 'นางสาวสายฝน ปลอดภัยดี',
            bed: 'A8', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'พญ.นภัสวรรณ ศัลยแพทย์',
            diagnosis: 'Observe Fever, Rule Out Dengue', age: '24 ปี', sex: 'หญิง',
            admitDate: daysAgo(1), religion: 'คริสต์', rightType: 'ชำระเงินเอง',
            latestMorse: 10, latestMaas: 4, latestBraden: 21, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000109', hn: 'HN000109', name: 'นายอาทิตย์ สายระโยง',
            bed: 'ICU-1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Post-Intubation, on Ventilator, Endotracheal Tube + Foley Cath', age: '55 ปี', sex: 'ชาย',
            admitDate: daysAgo(4), religion: 'อิสลาม', rightType: 'ข้าราชการ',
            latestMorse: 45, latestMaas: 5, latestBraden: 8, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000110', hn: 'HN000110', name: 'นางสมหญิง เตรียมกลับบ้าน',
            bed: 'A10', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Congestive Heart Failure, อาการคงที่ เตรียมจำหน่าย', age: '68 ปี', sex: 'หญิง',
            admitDate: daysAgo(7), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 24, latestMaas: 3, latestBraden: 19, latestBradenDate: daysAgo(1),
        },
    ];

    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }
    function todayStr() { return daysAgo(0); }

    // ==========================================================================
    // 2. "ฐานข้อมูลจำลอง" ทั้งหมด — เก็บใน localStorage เพื่อให้ข้อมูลที่พยาบาล
    //    ทดลองบันทึกระหว่างสาธิต ยังอยู่ครบแม้ปิด/เปิดเบราว์เซอร์ใหม่
    // ==========================================================================
    function loadDB() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return buildFreshDB();
    }

    function buildFreshDB() {
        const patients = {};
        SEED_PATIENTS.forEach(p => { patients[p.an] = { ...p }; });
        return {
            patients,
            braden: {},            // an -> [records]
            fallRisk: {},          // an -> [records]
            classifications: {},   // an -> [records]
            classificationsPed: {},// an -> [records]
            nursingNotes: {},      // an -> [records]
            focusList: {},         // an -> [records]
            nutrition: {},         // an -> {record}
            patientEdu: {},        // an -> {record}
            dischargeRecord: {},   // an -> {record}
            assessmentInitial: {}, // an -> {record}
            assessmentPed: {},     // an -> {record}
            serviceRequests: [],   // [records]
        };
    }

    let DB = loadDB();

    function persist() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        } catch (e) { console.warn('Demo DB persist failed', e); }
    }

    // เปิดให้เรียกจาก Console เพื่อรีเซ็ตข้อมูลจำลองกลับสู่ค่าเริ่มต้นได้ทุกเมื่อ
    window.resetDemoDatabase = function () {
        window.localStorage.removeItem(STORAGE_KEY);
        DB = buildFreshDB();
        persist();
        window.location.reload();
    };

    // ==========================================================================
    // 3. Templates ตัวอย่าง (Focus List / Nursing Note) ให้พร้อมใช้งานสาธิต
    // ==========================================================================
    const FOCUS_TEMPLATES = [
        { name: 'Acute Pain', focus: 'Acute Pain', goal: 'ผู้ป่วยปวดลดลง ระดับ Pain Score ≤ 3 ภายใน 24 ชม.' },
        { name: 'Risk for Falls', focus: 'Risk for Falls', goal: 'ผู้ป่วยปลอดภัยจากการพลัดตกหกล้มตลอดการรักษาตัวใน รพ.' },
        { name: 'Impaired Skin Integrity', focus: 'Impaired Skin Integrity', goal: 'ผิวหนังไม่เกิดแผลกดทับเพิ่มเติม/แผลเดิมมีขนาดเล็กลง' },
        { name: 'Ineffective Airway Clearance', focus: 'Ineffective Airway Clearance', goal: 'ทางเดินหายใจโล่ง ไม่มีเสียงครืดคราด SpO2 ≥ 95%' },
    ];
    const NURSING_TEMPLATES = [
        { name: 'ประเมินแรกรับ', s: 'ผู้ป่วย Conscious ดี รู้สึกตัวดี', o: 'V/S stable, Pain score 0/10', i: 'Orient ward, แนะนำการใช้กริ่งสัญญาณ', e: 'ผู้ป่วยเข้าใจคำแนะนำ' },
        { name: 'Fall Risk Prevention', s: '-', o: 'Morse Score สูง เสี่ยงพลัดตกหกล้ม', i: 'ล็อกล้อเตียง ยกไม้กั้นเตียงขึ้นสูงสุด แนะนำญาติเฝ้าไข้', e: 'ไม่มีการพลัดตกหกล้มเกิดขึ้น' },
    ];

    // ==========================================================================
    // 4. Helper: หาเวรจาก dedupe key เพื่ออัปเดตแทนการเพิ่มซ้ำ
    // ==========================================================================
    function upsertByKey(list, record, keyFn) {
        const key = keyFn(record);
        const idx = list.findIndex(r => keyFn(r) === key);
        if (idx >= 0) list[idx] = { ...list[idx], ...record };
        else list.push(record);
        return list;
    }

    function ensureArr(obj, an) {
        if (!obj[an]) obj[an] = [];
        return obj[an];
    }

    // ==========================================================================
    // 5. ตาราง Resource: ผูก action ชื่อ get/save/delete เข้ากับ store แต่ละประเภท
    // ==========================================================================
    const RESOURCES = {
        braden: {
            get: 'getBradenScale', save: ['saveBradenScale'], type: 'array',
            key: r => r.evalDate || r.EvalDate,
        },
        fallRisk: {
            get: 'getFallRisk', save: ['saveFallRisk', 'saveFallRiskSingle'], del: 'deleteFallRisk', type: 'array',
            key: r => `${r.evalDate}_${r.shift}`,
        },
        classifications: {
            get: 'getClassifications', save: ['saveClassification', 'saveClassificationSingle'], del: 'deleteClassification', type: 'array',
            key: r => `${r.evalDate}_${r.shift}`,
        },
        classificationsPed: {
            get: 'getClassificationsPed', save: ['saveClassificationPed'], del: 'deleteClassificationPed', type: 'array',
            key: r => `${r.evalDate}_${r.shift}`,
        },
        nursingNotes: {
            get: 'getNursingNotes', save: ['saveNursingNotes'], type: 'array',
            key: r => r.id,
        },
        focusList: {
            get: 'getFocusList', save: ['saveFocusList'], type: 'array',
            key: r => r.id,
        },
        nutrition: { get: 'getNutritionAssessment', save: ['saveNutritionAssessment'], type: 'object' },
        patientEdu: { get: 'getPatientEdu', save: ['savePatientEdu'], type: 'object' },
        dischargeRecord: { get: 'getDischargeRecord', save: ['saveDischargeRecord', 'saveDischargeDate'], type: 'object' },
        assessmentInitial: { get: 'getAssessmentInitial', save: ['saveAssessmentInitial'], type: 'object' },
        assessmentPed: { get: 'getAssessmentPed', save: ['saveAssessmentPed'], type: 'object' },
    };

    // สร้างตารางย้อนกลับ: actionName -> { resourceKey, op }
    const ACTION_MAP = {};
    Object.keys(RESOURCES).forEach(resKey => {
        const r = RESOURCES[resKey];
        ACTION_MAP[r.get] = { resKey, op: 'get' };
        (r.save || []).forEach(a => { ACTION_MAP[a] = { resKey, op: 'save' }; });
        if (r.del) ACTION_MAP[r.del] = { resKey, op: 'del' };
    });

    // ==========================================================================
    // 6. ตัวจัดการคำขอ (Router) — คืนค่า Object ธรรมดา ไม่ใช่ Response
    // ==========================================================================
    function ok(extra) { return Object.assign({ status: 'success' }, extra || {}); }
    function fail(message) { return { status: 'error', message: message || 'เกิดข้อผิดพลาด (โหมดสาธิต)' }; }

    function handleAction(action, payload, queryParams) {
        // ---- Auth ----
        if (action === 'loginUser') {
            const u = String(payload?.username || '').trim().toLowerCase();
            const p = String(payload?.password || '');
            if (u === DEMO_USERNAME && p === DEMO_PASSWORD) {
                return ok({
                    sessionToken: DEMO_TOKEN,
                    user: { username: 'admin', fullName: 'พยาบาลผู้สาธิต (Demo Admin)', position: 'พยาบาลวิชาชีพปฏิบัติการ', role: 'admin' }
                });
            }
            return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (โหมดสาธิต: ใช้ admin / 1234)');
        }
        if (action === 'getSessionUser') {
            const token = queryParams.get('sessionToken');
            if (token === DEMO_TOKEN) {
                return ok({ user: { username: 'admin', fullName: 'พยาบาลผู้สาธิต (Demo Admin)', position: 'พยาบาลวิชาชีพปฏิบัติการ', role: 'admin' } });
            }
            return fail('session invalid');
        }
        if (action === 'logoutUser') return ok();
        if (['sendRegistrationVerification', 'verifyRegistrationCode', 'sendPasswordResetLink', 'resetPasswordWithToken'].includes(action)) {
            return fail('ฟังก์ชันนี้ปิดใช้งานในโหมดสาธิต (ใช้บัญชี admin / 1234 เพื่อเข้าสู่ระบบ)');
        }

        // ---- Init / Reference data ----
        if (action === 'getInitData') {
            return {
                wards: [DEMO_WARD],
                depts: ['อายุรกรรม', 'ศัลยกรรม', 'ศัลยกรรมกระดูก', 'กุมารเวชกรรม'],
                doctors: ['นพ.ประเสริฐ วงศ์แพทย์', 'พญ.นภัสวรรณ ศัลยแพทย์', 'นพ.วิชัย กระดูกและข้อ', 'พญ.สุกัญญา กุมารแพทย์'],
                nurses: [
                    { name: 'พยาบาลผู้สาธิต (Demo Admin)', position: 'พยาบาลวิชาชีพปฏิบัติการ' },
                    { name: 'สมหญิง ใจงาม', position: 'พยาบาลวิชาชีพ' },
                    { name: 'สมศรี ตั้งใจดี', position: 'ผู้ช่วยเหลือคนไข้' },
                ],
            };
        }
        if (action === 'getPatients') {
            const ward = queryParams.get('ward');
            const list = Object.values(DB.patients).filter(p => !ward || p.ward === ward);
            return list;
        }
        if (action === 'getBeds') {
            return ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','สงฆ์-1','สงฆ์-2','เด็ก-1','เด็ก-2','ICU-1','ICU-2'];
        }
        if (action === 'getFocusTemplates') return FOCUS_TEMPLATES;
        if (action === 'getNursingTemplates') return NURSING_TEMPLATES;

        // ---- Service requests ----
        if (action === 'createServiceRequest') {
            const rec = { id: Date.now(), status: 'รอดำเนินการ', ...payload };
            DB.serviceRequests.push(rec);
            persist();
            return ok({ id: rec.id });
        }
        if (action === 'getServiceRequests') return DB.serviceRequests;
        if (action === 'updateServiceRequestStatus') {
            const item = DB.serviceRequests.find(r => String(r.id) === String(payload?.id));
            if (item) { item.status = payload.status || item.status; persist(); return ok(); }
            return fail('ไม่พบรายการ');
        }

        // ---- Discharge flow (patient-level fields) ----
        if (action === 'dischargePatient') {
            const p = DB.patients[payload?.an];
            if (p) { p.dischargeDate = payload.dischargeDate || todayStr(); p.discharged = true; persist(); }
            return ok();
        }
        if (action === 'undoDischargePatient') {
            const p = DB.patients[payload?.an];
            if (p) { delete p.dischargeDate; p.discharged = false; persist(); }
            return ok();
        }
        if (action === 'searchDischargedPatients') {
            return Object.values(DB.patients).filter(p => p.discharged);
        }

        // ---- Generic resource dispatch (get / save / delete) ----
        const mapped = ACTION_MAP[action];
        if (mapped) {
            const resDef = RESOURCES[mapped.resKey];
            const an = queryParams.get('an') || payload?.an || payload?.AN;

            if (mapped.op === 'get') {
                if (resDef.type === 'array') return ensureArr(DB[mapped.resKey], an).slice();
                return DB[mapped.resKey][an] || {};
            }
            if (mapped.op === 'save') {
                if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
                if (resDef.type === 'array') {
                    const list = ensureArr(DB[mapped.resKey], an);
                    const record = { ...payload, id: payload.id || Date.now() };
                    if (resDef.key) upsertByKey(list, record, resDef.key);
                    else list.push(record);
                } else {
                    DB[mapped.resKey][an] = { ...payload };
                }
                persist();
                return ok();
            }
            if (mapped.op === 'del') {
                const list = ensureArr(DB[mapped.resKey], an);
                const key = resDef.key(payload);
                DB[mapped.resKey][an] = list.filter(r => resDef.key(r) !== key);
                persist();
                return ok();
            }
        }

        // ---- CANDI AI Assistant chat (ไม่มี action, มี question/context) ----
        if (payload && typeof payload.question === 'string') {
            return {
                reply: 'ฟีเจอร์ผู้ช่วย AI (CANDI) ปิดใช้งานอยู่ในโหมดสาธิต เนื่องจากเว็บจำลองนี้ไม่ได้เชื่อมต่อกับเซิร์ฟเวอร์ AI จริง — ฟีเจอร์นี้ใช้งานได้ตามปกติในระบบใช้งานจริงค่ะ'
            };
        }

        // ---- Fallback: ไม่รู้จัก action นี้ ----
        console.warn('[Demo Mock API] Unhandled action:', action, payload);
        return fail(`โหมดสาธิตยังไม่รองรับคำสั่งนี้ (${action || 'unknown'})`);
    }

    // ==========================================================================
    // 7. ดัก window.fetch ทุกครั้งที่ปลายทางคือ API_URL ของแอป (Google Apps Script)
    // ==========================================================================
    const originalFetch = window.fetch.bind(window);
    const API_HOST_MATCH = 'script.google.com';

    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const isApiCall = url.includes(API_HOST_MATCH);

        if (!isApiCall) {
            return originalFetch(input, init);
        }

        // ---- ตรวจว่าเป็นคำถาม CANDI AI หรือไม่ (ไม่มี action, มี question) ----
        // ถ้าใช่ และเปิด ALLOW_REAL_CANDI_CHAT ไว้ ให้ปล่อยผ่านไปเซิร์ฟเวอร์ AI จริง
        if (ALLOW_REAL_CANDI_CHAT && init && init.method === 'POST' && init.body) {
            let maybeChatBody = null;
            try { maybeChatBody = JSON.parse(init.body); } catch (e) { /* not JSON */ }
            const isCandiChat = maybeChatBody && !maybeChatBody.action && typeof maybeChatBody.question === 'string';
            if (isCandiChat) {
                return originalFetch(input, init).catch((err) => {
                    console.warn('[Demo Mock API] CANDI real call failed, ใช้ข้อความสำรองแทน', err);
                    return new Response(JSON.stringify({
                        reply: 'ขณะนี้เชื่อมต่อผู้ช่วย AI (CANDI) ไม่ได้ (อาจไม่มีสัญญาณอินเทอร์เน็ตที่บูธ) กรุณาลองใหม่อีกครั้ง หรือแจ้งเจ้าหน้าที่ประจำบูธค่ะ'
                    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                });
            }
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const urlObj = new URL(url, window.location.href);
                    const queryParams = urlObj.searchParams;
                    let action = queryParams.get('action');
                    let payload = null;

                    if (init && init.method === 'POST' && init.body) {
                        let parsedBody = {};
                        try { parsedBody = JSON.parse(init.body); } catch (e) { parsedBody = {}; }
                        action = action || parsedBody.action;
                        payload = parsedBody.payload || parsedBody;
                    }

                    const result = handleAction(action, payload, queryParams);
                    resolve(new Response(JSON.stringify(result), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                } catch (err) {
                    console.error('[Demo Mock API] Error handling request', err);
                    resolve(new Response(JSON.stringify(fail(err.message)), { status: 200 }));
                }
            }, NETWORK_DELAY_MS);
        });
    };

    // ==========================================================================
    // 8. แบนเนอร์แจ้งเตือนว่านี่คือ "ฐานข้อมูลจำลอง" — ติดตรึงไว้บนสุดของหน้าเว็บเสมอ
    // ==========================================================================
    function injectDemoBanner() {
        const style = document.createElement('style');
        style.textContent = `
            #demo-mode-banner {
                position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
                background: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 12px, #d97706 12px, #d97706 24px);
                color: #fff; font-weight: 900; font-size: 12px; text-align: center;
                padding: 6px 10px; letter-spacing: .04em;
                box-shadow: 0 2px 10px rgba(0,0,0,.25);
                font-family: inherit;
            }
            #demo-mode-banner span {
                background: rgba(15,23,42,.75); padding: 3px 10px; border-radius: 999px;
            }
            body { padding-top: 30px !important; }
            #demo-reset-btn {
                position: fixed; bottom: 14px; right: 14px; z-index: 999999;
                background: #0f172a; color: #fff; border: none; border-radius: 999px;
                padding: 10px 16px; font-size: 11px; font-weight: 800; cursor: pointer;
                box-shadow: 0 4px 14px rgba(0,0,0,.3); opacity: .85;
            }
            #demo-reset-btn:hover { opacity: 1; }
        `;
        document.head.appendChild(style);

        const banner = document.createElement('div');
        banner.id = 'demo-mode-banner';
        banner.innerHTML = '<span>⚠️ ระบบสาธิตนวัตกรรม (DEMO) — ข้อมูลผู้ป่วยทั้งหมดเป็นข้อมูลจำลอง ไม่ใช่ข้อมูลผู้ป่วยจริง</span>';
        document.body.appendChild(banner);

        const resetBtn = document.createElement('button');
        resetBtn.id = 'demo-reset-btn';
        resetBtn.type = 'button';
        resetBtn.innerText = '↺ รีเซ็ตข้อมูลจำลอง';
        resetBtn.onclick = function () {
            if (window.confirm('ล้างข้อมูลที่ทดลองบันทึกทั้งหมด และเริ่มต้นชุดข้อมูลจำลองใหม่ใช่หรือไม่?')) {
                window.resetDemoDatabase();
            }
        };
        document.body.appendChild(resetBtn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectDemoBanner);
    } else {
        injectDemoBanner();
    }

    console.info('%c[DEMO MODE] Mock API เปิดใช้งานแล้ว — ไม่มีการเรียก Google Apps Script จริง (login: admin / 1234)', 'color:#d97706;font-weight:bold;');
})();
