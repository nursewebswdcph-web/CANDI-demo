/**
 * ==========================================================================
 * DEMO MOCK API  —  IPD Nurse Workbench (โหมดสาธิต/จำลอง)
 * ==========================================================================
 * ไฟล์นี้จำลอง Backend (Google Apps Script) ทั้งหมดไว้ในฝั่ง Browser
 * โดย "ดัก" การเรียก fetch() ทุกครั้งที่ปลายทางเป็น API_URL ของแอป แล้วตอบกลับ
 * ด้วยข้อมูลจำลอง (mock data) แทน จึงไม่มีการเรียก API จริงออกไปอินเทอร์เน็ตเลย
 * -> เปิดเว็บได้เร็ว ใช้แสดงในบูธนวัตกรรมได้แม้ไม่มีสัญญาณเน็ต
 *
 * ผู้ป่วยจำลองทุกเคสมี "ผลการประเมิน/บันทึกที่กรอกไว้ล่วงหน้าแล้ว" (Braden,
 * Morse/MAAS, การจำแนกประเภทผู้ป่วย, Nursing Note, Focus List ฯลฯ) ให้กรรมการ
 * เปิดดูได้ทันทีโดยไม่ต้องกรอกข้อมูลใหม่หน้างาน
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
    const STORAGE_KEY = 'candi_demo_db_v2';
    const NETWORK_DELAY_MS = 220; // หน่วงเล็กน้อยให้รู้สึกเหมือนมีการโหลดข้อมูลจริง

    // โหมดสาธิตต้องตอบได้แม้ไม่มีอินเทอร์เน็ต จึงใช้ข้อความจำลองเป็นค่าเริ่มต้น
    // หากต้องการทดสอบ Edge Function จริง ให้เปลี่ยนเป็น true และต้องมีเครือข่ายพร้อมใช้
    const ALLOW_REAL_CANDI_CHAT = false;

    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }
    function todayStr() { return daysAgo(0); }
    function isoNow() { return new Date().toISOString(); }

    function makeDemoCandiReply(init) {
        let request = {};
        try { request = JSON.parse((init && init.body) || '{}'); } catch (e) { request = {}; }

        const question = String(request.question || 'คำถามเกี่ยวกับผู้ป่วย');
        const context = request.context || {};
        const patient = context.patient || context.patientInfo || {};
        const patientLabel = patient.name || patient.patientName || 'ผู้ป่วยที่เลือก';

        return [
            'นี่คือคำตอบจำลองจากน้อง CANDI สำหรับการสาธิตค่ะ',
            `ผู้ป่วย: ${patientLabel}`,
            `คำถาม: ${question}`,
            '',
            'ประเด็นที่ควรทบทวน:',
            '• ตรวจสอบสัญญาณชีพ อาการเปลี่ยนแปลง และผลการประเมินความเสี่ยงล่าสุด',
            '• ทบทวนแผนการพยาบาลและบันทึก Nursing Progress Note ให้สอดคล้องกับอาการปัจจุบัน',
            '• หากพบอาการผิดปกติหรือความเสี่ยงเพิ่มขึ้น ให้ประเมินซ้ำและรายงานพยาบาลวิชาชีพ/แพทย์ตามแนวทางของหน่วยงาน',
            '',
            'หมายเหตุ: ข้อความนี้เป็นข้อมูลจำลองเพื่อแสดงการทำงานของระบบ ไม่ใช่คำสั่งการรักษาและไม่แทนการตัดสินใจของพยาบาลค่ะ'
        ].join('\n');
    }

    // ==========================================================================
    // 1. ข้อมูลผู้ป่วยจำลอง (หลากหลายเคสให้ผู้เข้าชมทดลองใช้งาน)
    // ==========================================================================
    const DEMO_WARD = 'หอผู้ป่วยสาธิต (DEMO)';

    const SEED_PATIENTS = [
        {
            an: '68000101', hn: 'HN000101', name: 'นายสมชาย ใจดี (ผู้ป่วยตัวอย่าง)',
            bed: 'A1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Ischemic Stroke with Right Hemiplegia', dx: 'Ischemic Stroke with Right Hemiplegia',
            age: '78 ปี', ageDisplay: '78 ปี', sex: 'ชาย',
            admitDate: daysAgo(6), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 65, latestMaas: 2, latestBraden: 11, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000102', hn: 'HN000102', name: 'พระสมพงษ์ ธมฺมชโย (พระอาพาธ)',
            bed: 'สงฆ์-1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Community-Acquired Pneumonia, Diabetes Mellitus type 2', dx: 'Community-Acquired Pneumonia, Diabetes Mellitus type 2',
            age: '65 ปี', ageDisplay: '65 ปี', sex: 'ชาย',
            admitDate: daysAgo(3), religion: 'พุทธ (พระภิกษุ)', rightType: 'ข้าราชการ',
            latestMorse: 30, latestMaas: 3, latestBraden: 17, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000103', hn: 'HN000103', name: 'นางสาวพิมพ์ใจ รักสุขภาพ',
            bed: 'A3', ward: DEMO_WARD, dept: 'ศัลยกรรม', doctor: 'พญ.นภัสวรรณ ศัลยแพทย์',
            diagnosis: 'Post-op Appendectomy Day 1 (Post-Laparotomy)', dx: 'Post-op Appendectomy Day 1 (Post-Laparotomy)',
            age: '29 ปี', ageDisplay: '29 ปี', sex: 'หญิง',
            admitDate: daysAgo(1), religion: 'พุทธ', rightType: 'ประกันสังคม',
            latestMorse: 15, latestMaas: 4, latestBraden: 20, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000104', hn: 'HN000104', name: 'นายบุญมี เท้าบวม',
            bed: 'A4', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Diabetic Foot Ulcer, Uncontrolled DM', dx: 'Diabetic Foot Ulcer, Uncontrolled DM',
            age: '61 ปี', ageDisplay: '61 ปี', sex: 'ชาย',
            admitDate: daysAgo(9), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 40, latestMaas: 3, latestBraden: 13, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000105', hn: 'HN000105', name: 'ด.ญ.น้ำฝน แข็งแรงดี',
            bed: 'เด็ก-1', ward: DEMO_WARD, dept: 'กุมารเวชกรรม', doctor: 'พญ.สุกัญญา กุมารแพทย์',
            diagnosis: 'Acute Gastroenteritis with Mild Dehydration', dx: 'Acute Gastroenteritis with Mild Dehydration',
            age: '6 ปี', ageDisplay: '6 ปี', sex: 'หญิง',
            admitDate: daysAgo(2), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: '', latestMaas: '', latestBraden: '', latestBradenDate: '',
        },
        {
            an: '68000106', hn: 'HN000106', name: 'นางประไพ ระยะท้าย',
            bed: 'A6', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Metastatic Breast Cancer, Palliative Care', dx: 'Metastatic Breast Cancer, Palliative Care',
            age: '70 ปี', ageDisplay: '70 ปี', sex: 'หญิง',
            admitDate: daysAgo(14), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 55, latestMaas: 1, latestBraden: 9, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000107', hn: 'HN000107', name: 'นายเดชา ขาหัก',
            bed: 'A7', ward: DEMO_WARD, dept: 'ศัลยกรรมกระดูก', doctor: 'นพ.วิชัย กระดูกและข้อ',
            diagnosis: 'Closed Fracture Right Femur, รอผ่าตัด ORIF', dx: 'Closed Fracture Right Femur, รอผ่าตัด ORIF',
            age: '45 ปี', ageDisplay: '45 ปี', sex: 'ชาย',
            admitDate: daysAgo(1), religion: 'พุทธ', rightType: 'ประกันสังคม',
            latestMorse: 70, latestMaas: 3, latestBraden: 15, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000108', hn: 'HN000108', name: 'นางสาวสายฝน ปลอดภัยดี',
            bed: 'A8', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'พญ.นภัสวรรณ ศัลยแพทย์',
            diagnosis: 'Observe Fever, Rule Out Dengue', dx: 'Observe Fever, Rule Out Dengue',
            age: '24 ปี', ageDisplay: '24 ปี', sex: 'หญิง',
            admitDate: daysAgo(1), religion: 'คริสต์', rightType: 'ชำระเงินเอง',
            latestMorse: 10, latestMaas: 4, latestBraden: 21, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000109', hn: 'HN000109', name: 'นายอาทิตย์ สายระโยง',
            bed: 'ICU-1', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Post-Intubation, on Ventilator, Endotracheal Tube + Foley Cath', dx: 'Post-Intubation, on Ventilator, Endotracheal Tube + Foley Cath',
            age: '55 ปี', ageDisplay: '55 ปี', sex: 'ชาย',
            admitDate: daysAgo(4), religion: 'อิสลาม', rightType: 'ข้าราชการ',
            latestMorse: 45, latestMaas: 5, latestBraden: 8, latestBradenDate: daysAgo(1),
        },
        {
            an: '68000110', hn: 'HN000110', name: 'นางสมหญิง เตรียมกลับบ้าน',
            bed: 'A10', ward: DEMO_WARD, dept: 'อายุรกรรม', doctor: 'นพ.ประเสริฐ วงศ์แพทย์',
            diagnosis: 'Congestive Heart Failure, อาการคงที่ เตรียมจำหน่าย', dx: 'Congestive Heart Failure, อาการคงที่ เตรียมจำหน่าย',
            age: '68 ปี', ageDisplay: '68 ปี', sex: 'หญิง',
            admitDate: daysAgo(7), religion: 'พุทธ', rightType: 'บัตรทอง (UC)',
            latestMorse: 20, latestMaas: 3, latestBraden: 19, latestBradenDate: daysAgo(1),
        },
    ];

    const DEFAULT_ASSESSOR = 'พยาบาลผู้สาธิต (Demo Admin)';

    // ==========================================================================
    // 2. Helper สร้างเรคคอร์ดแต่ละประเภท (ให้ตรงกับรูปแบบที่หน้าเว็บอ่านจริง)
    // ==========================================================================

    // --- Braden Scale: backend คืนค่าเป็น PascalCase ตามหัวคอลัมน์ชีต ---
    function bradenRecord(an, hn, ward, opts) {
        return {
            Timestamp: opts.timestamp || isoNow(),
            AN: an, HN: hn, Ward: ward,
            EvalDate: opts.evalDate,
            AdmitDate: opts.admitDate || '', TransferDate: '', FromWard: '', FirstEvalDate: opts.firstEvalDate || opts.evalDate,
            Diagnosis: opts.diagnosis || '',
            InitialUlcer: opts.initialUlcer || 'ไม่มี', InitialUlcerDetail: opts.initialUlcerDetail || '',
            Albumin: opts.albumin || '', Hb: opts.hb || '', Hct: opts.hct || '', BMI: opts.bmi || '',
            S1_M1: opts.s1[0], S1_M2: opts.s1[1], S1_M3: opts.s1[2], S1_M4: opts.s1[3], S1_M5: opts.s1[4], S1_M6: opts.s1[5],
            TotalScore: opts.s1.reduce((a, b) => a + b, 0),
            S3_Location: opts.s3Location || '', S3_Stage: opts.s3Stage || '', S3_Appearance: opts.s3Appearance || '',
            Assessor: opts.assessor || DEFAULT_ASSESSOR,
            S4_DischargeDate: '', S4_Outcome: '', S4_UlcerDate: '', S4_Location: '', S4_Size: '', S4_Appearance: '', S4_Stage: '', S4_Count: ''
        };
    }

    // --- Fall Risk (Morse/MAAS): backend คืนค่าเป็น lowercase ---
    function fallRiskRecord(opts) {
        return {
            evalDate: opts.evalDate, shift: opts.shift,
            m1: opts.m[0], m2: opts.m[1], m3: opts.m[2], m4: opts.m[3], m5: opts.m[4], m6: opts.m[5],
            morseTotal: opts.m.reduce((a, b) => a + b, 0),
            maasScore: opts.maas,
            assessor: opts.assessor || DEFAULT_ASSESSOR,
            timestamp: opts.timestamp || isoNow()
        };
    }

    // --- Classification (ผู้ป่วยผู้ใหญ่): lowercase, scores เป็น array 8 ข้อ ---
    function classificationRecord(opts) {
        const total = opts.scores.reduce((a, b) => a + b, 0);
        return {
            evalDate: opts.evalDate, shift: opts.shift,
            scores: opts.scores, total,
            category: opts.category || (total >= 20 ? 'IV (Intensive Care)' : total >= 14 ? 'III (Total Care)' : total >= 8 ? 'II (Partial Care)' : 'I (Self Care)'),
            assessor: opts.assessor || DEFAULT_ASSESSOR,
            timestamp: opts.timestamp || isoNow()
        };
    }

    // --- Classification (ผู้ป่วยเด็ก) ---
    function classificationPedRecord(opts) {
        const formData = {};
        opts.items.forEach((v, i) => { formData['item' + (i + 1)] = v; });
        const score = opts.items.reduce((a, b) => a + b, 0);
        return {
            evalDate: opts.evalDate, shift: opts.shift,
            score, classType: opts.classType || (score >= 20 ? 'Intensive Care' : score >= 12 ? 'Total Care' : 'Partial Care'),
            assessor: opts.assessor || DEFAULT_ASSESSOR,
            formData, scores: opts.items,
            timestamp: opts.timestamp || isoNow()
        };
    }

    // --- Nursing Progress Note (SOIE) ---
    let noteIdCounter = 1000;
    function nursingNote(opts) {
        return {
            id: opts.id || (noteIdCounter++),
            date: opts.date, shift: opts.shift, time: opts.time || '08:30',
            focus: opts.focus, s: opts.s || '', o: opts.o || '', i: opts.i || '', e: opts.e || '',
            eTime: opts.eTime || opts.time || '08:30',
            nurse: opts.nurse || DEFAULT_ASSESSOR, pos: opts.pos || 'พยาบาลวิชาชีพปฏิบัติการ'
        };
    }

    // --- Focus List ---
    let focusIdCounter = 2000;
    function focusItem(opts) {
        return {
            id: opts.id || (focusIdCounter++),
            focus: opts.focus, goal: opts.goal,
            startDate: opts.startDate, endDate: opts.endDate || ''
        };
    }

    // ==========================================================================
    // 3. Templates ตัวอย่าง (Focus List / Nursing Note) ให้พร้อมใช้งานสาธิต
    // ==========================================================================
    const FOCUS_TEMPLATES = [
        { id: 1, problemName: 'Acute Pain', focus: 'Acute Pain', goal: 'ผู้ป่วยปวดลดลง ระดับ Pain Score ≤ 3 ภายใน 24 ชม.' },
        { id: 2, problemName: 'Risk for Falls', focus: 'Risk for Falls', goal: 'ผู้ป่วยปลอดภัยจากการพลัดตกหกล้มตลอดการรักษาตัวใน รพ.' },
        { id: 3, problemName: 'Impaired Skin Integrity', focus: 'Impaired Skin Integrity', goal: 'ผิวหนังไม่เกิดแผลกดทับเพิ่มเติม/แผลเดิมมีขนาดเล็กลง' },
        { id: 4, problemName: 'Ineffective Airway Clearance', focus: 'Ineffective Airway Clearance', goal: 'ทางเดินหายใจโล่ง ไม่มีเสียงครืดคราด SpO2 ≥ 95%' },
    ];
    const NURSING_TEMPLATES = [
        { id: 1, name: 'ประเมินแรกรับ', s: 'ผู้ป่วย Conscious ดี รู้สึกตัวดี', o: 'V/S stable, Pain score 0/10', i: 'Orient ward, แนะนำการใช้กริ่งสัญญาณ', e: 'ผู้ป่วยเข้าใจคำแนะนำ' },
        { id: 2, name: 'Fall Risk Prevention', s: '-', o: 'Morse Score สูง เสี่ยงพลัดตกหกล้ม', i: 'ล็อกล้อเตียง ยกไม้กั้นเตียงขึ้นสูงสุด แนะนำญาติเฝ้าไข้', e: 'ไม่มีการพลัดตกหกล้มเกิดขึ้น' },
    ];

    function parseAgeYears(patient) {
        if (!patient) return 0;
        const raw = String(patient.ageDisplay || patient.age || '').trim();
        const match = raw.match(/(\d+)/);
        return match ? Number(match[1]) : 0;
    }

    function isPediatricPatient(patient) {
        return parseAgeYears(patient) > 0 && parseAgeYears(patient) < 15;
    }

    function makeBradenScores(total) {
        const t = Number(total) || 18;
        if (t <= 9) return [1, 1, 1, 2, 2, 2];
        if (t <= 12) return [2, 2, 2, 2, 2, 2];
        if (t <= 15) return [2, 2, 3, 2, 3, 3];
        if (t <= 18) return [3, 3, 3, 3, 3, 3];
        return [4, 4, 4, 4, 4, 4];
    }

    function makeFallScores(total) {
        const t = Number(total) || 0;
        if (t <= 10) return [0, 0, 0, 0, 0, 0];
        if (t <= 20) return [0, 0, 15, 0, 0, 0];
        if (t <= 35) return [0, 15, 15, 0, 0, 0];
        if (t <= 50) return [0, 15, 15, 0, 10, 0];
        return [25, 15, 15, 0, 10, 0];
    }

    function makeAdultClassificationScores(patient) {
        const diagnosis = String(patient?.diagnosis || '').toLowerCase();
        if (/(ventilator|icu|stroke|palliative|fracture|foot ulcer|pneumonia|heart failure)/.test(diagnosis)) {
            return [3, 3, 2, 3, 2, 3, 2, 2];
        }
        if (/(post-op|post operative|appendectomy|observe|fever)/.test(diagnosis)) {
            return [2, 2, 1, 2, 1, 2, 1, 1];
        }
        return [2, 2, 2, 2, 2, 2, 2, 2];
    }

    function makePediatricClassificationScores(patient) {
        const diagnosis = String(patient?.diagnosis || '').toLowerCase();
        if (/dehydration|gastroenteritis/.test(diagnosis)) {
            return [1, 1, 2, 1, 1, 2, 1, 1, 1, 1];
        }
        return [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    }

    function makeAdultAssessmentSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '');
        const diagnosisLower = diagnosis.toLowerCase();
        const needsAssist = /(stroke|hemiplegia|fracture|icu|ventilator|palliative|ulcer|heart failure|pneumonia|diabetic foot)/.test(diagnosisLower);
        const hasDm = /(dm|diabetes)/.test(diagnosisLower);
        const hasHeart = /(heart failure|chf|cardiac)/.test(diagnosisLower);
        const isSurgical = /(post-op|post operative|appendectomy|orif|laparotomy|fracture)/.test(diagnosisLower);
        const hasCancer = /(cancer|palliative)/.test(diagnosisLower);

        return {
            HN: patient?.hn || '',
            AN: patient?.an || '',
            Bed: patient?.bed || '',
            Ward: patient?.ward || DEMO_WARD,
            AdmitDate: patient?.admitDate || todayStr(),
            AdmitTime: '08:15',
            AdmittedFrom: needsAssist ? 'ER' : 'OPD',
            Refer: '',
            ArriveBy: needsAssist ? 'เปลนอน' : 'รถนั่ง',
            InfoSource: needsAssist ? 'ผู้นำส่ง/ญาติ' : 'ผู้ป่วย',
            MainCaregiver_Name: isPediatricPatient(patient) ? 'มารดาผู้ป่วย' : 'ญาติผู้ป่วย',
            MainCaregiver_Rel: isPediatricPatient(patient) ? 'บิดา/มารดา' : 'บุตร',
            ChiefComplaint: diagnosis,
            PresentIllness: `${diagnosis} รับไว้สังเกตอาการและดูแลต่อเนื่อง`,
            AdmitSymptoms: needsAssist ? 'อ่อนเพลีย ต้องการช่วยเหลือในการเคลื่อนไหว' : 'รู้สึกตัวดี อาการคงที่',
            Admit_BT: hasCancer ? '37.1' : '36.8',
            Admit_PR: needsAssist ? '88' : '78',
            Admit_RR: needsAssist ? '20' : '18',
            Admit_BP: needsAssist ? '138/82' : '120/80',
            Hx_HT: false,
            Hx_Heart: hasHeart,
            Hx_Liver: false,
            Hx_Kidney: false,
            Hx_DM: hasDm,
            Hx_Asthma: false,
            Hx_Epilepsy: false,
            Hx_TB: false,
            Hx_Cancer: hasCancer,
            Hx_Cancer_Detail: hasCancer ? diagnosis : '',
            Hx_Other_Check: false,
            Hx_Other: '',
            Allergy_Status: 'ไม่เคย',
            Allergy_Detail: '',
            AdmitHx_Status: 'ไม่เคย',
            AdmitHx_Disease: '',
            AdmitHx_When: '',
            Sx_Status: isSurgical ? 'เคย' : 'ไม่เคย',
            Sx_Detail: isSurgical ? diagnosis : '',
            Sx_When: isSurgical ? (patient?.admitDate || todayStr()) : '',
            FamilyHx_Status: 'ไม่มี',
            FamilyHx_Detail: '',
            Substance_Alcohol: 'ไม่ดื่ม',
            Substance_Alcohol_Vol: '',
            Substance_Smoke: 'ไม่สูบ',
            Substance_Smoke_Vol: '',
            Meds_Status: hasDm || hasHeart || hasCancer ? 'ยาโรคประจำตัวตาม Med Reconcile' : 'ไม่มี',
            Meds_Detail: hasDm || hasHeart || hasCancer ? diagnosis : '',
            HP_Before: 'ดี',
            HP_Before_Detail: '',
            HP_Current_Severity: needsAssist ? 'รุนแรง' : 'ไม่รุนแรง',
            HP_Care: needsAssist ? ['ไปรพ./คลินิก', 'ซื้อยารับประทาน'] : ['ไปรพ./คลินิก'],
            HP_Care_Other: '',
            Expectation: 'หาย',
            Nutri_Meals: isPediatricPatient(patient) ? '3' : '3',
            Nutri_Type: hasDm ? ['อาหารเฉพาะโรค'] : ['อาหารธรรมดา'],
            Nutri_Type_Detail: hasDm ? 'DM' : '',
            Nutri_Problem_Status: 'ไม่มี',
            Nutri_Problem_Detail: '',
            Skin_Status: needsAssist ? 'ต้องเฝ้าระวัง' : 'ปกติ',
            Skin_Detail: needsAssist ? 'เสี่ยงแผลกดทับ' : '',
            Stress_Express: 'ปกติ',
            Stress_Express_Other: '',
            Stress_Resolve: ['ปรึกษาผู้อื่น'],
            Stress_Resolve_Other: '',
            Role_Impact: needsAssist ? ['ครอบครัว', 'การศึกษา'] : ['ครอบครัว'],
            Menstrual_Status: '',
            Sex_Menstrual: '',
            Sex_Menstrual_Detail: '',
            Sex_Breast: '',
            Sex_Breast_Detail: '',
            Sex_Genital: '',
            Sex_Genital_Detail: '',
            Belief_Cause: ['ตามวัย'],
            Belief_Cause_Other: '',
            Belief_Practice: 'ไม่มี',
            Belief_Practice_Detail: '',
            Belief_Anchor: 'มี',
            Belief_Anchor_Detail: 'ครอบครัว',
            Involve_Status: 'ต้องการ',
            Involve_Detail: ['ทราบข้อมูลเรื่องโรคและแนวทางรักษาพยาบาล', 'เรียนรู้ทักษะดูแลตนเอง/ผู้ป่วย'],
            Involve_Other: '',
            Pain_Status: needsAssist || isSurgical ? 'มี' : 'ไม่มี',
            Pain_Location: isSurgical ? 'บริเวณแผลผ่าตัด/ตำแหน่งที่มีอาการ' : '',
            Pain_Cause: isSurgical ? 'หลังผ่าตัด/การอักเสบ' : '',
            Pain_Type: isSurgical ? 'ครั้งคราว' : '',
            Pain_Scale_Score: needsAssist || isSurgical ? '4' : '0',
            Pain_Impact: needsAssist || isSurgical ? ['การนอน', 'การทำกิจกรรม'] : [],
            Pain_Relief: needsAssist || isSurgical ? ['Medication', 'Reposition'] : [],
            Assessor_Name: DEFAULT_ASSESSOR,
            Assessor_Pos: 'พยาบาลวิชาชีพปฏิบัติการ'
        };
    }

    function makePediatricAssessmentSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '');
        return {
            HN: patient?.hn || '',
            AN: patient?.an || '',
            Bed: patient?.bed || '',
            Ward: patient?.ward || DEMO_WARD,
            ped_AdmitDate: patient?.admitDate || todayStr(),
            ped_AdmitTime: '09:00',
            ped_AdmittedFrom: 'ER',
            ped_Refer: '',
            ped_ArriveBy: 'รถนั่ง',
            ped_DeliverBy: 'มารดา',
            ped_Informant: 'ญาติ',
            ped_InformantOther: '',
            ped_CC: diagnosis,
            ped_PI: `${diagnosis} รับไว้เฝ้าระวังอาการและให้สารน้ำ`,
            ped_AddressHome: patient?.address || '',
            ped_AssessorName: DEFAULT_ASSESSOR,
            ped_AssessorPosition: 'พยาบาลวิชาชีพปฏิบัติการ'
        };
    }

    function makePatientEduSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '').toLowerCase();
        const hasDm = /(dm|diabetes)/.test(diagnosis);
        const hasHeart = /(heart failure|chf|cardiac)/.test(diagnosis);
        const hasWound = /(ulcer|wound|fracture|post-op|palliative)/.test(diagnosis);
        const baseSection = (overrides = {}) => ({
            checked: false,
            text1: '',
            text2: '',
            text3: '',
            options: [],
            date: daysAgo(1),
            provider: DEFAULT_ASSESSOR,
            pos: 'พยาบาลวิชาชีพปฏิบัติการ',
            receiver: 'ผู้ป่วย',
            ...overrides
        });

        return {
            D1: baseSection({ checked: true, text1: hasDm ? 'แนะนำอาหารเบาหวาน ลดหวาน มัน เค็ม' : 'แนะนำการสังเกตอาการผิดปกติและการมาพบแพทย์', receiver: 'ผู้ป่วยและญาติ' }),
            M1: baseSection({ checked: true, text1: hasHeart ? 'แนะนำรับประทานยาตามแพทย์สั่งอย่างต่อเนื่อง' : 'แนะนำการรับประทานยาตามแผนการรักษา', text2: 'ห้ามหยุดยาเอง', receiver: 'ผู้ป่วย' }),
            E1: baseSection({ checked: true, options: ['การจัดสิ่งแวดล้อมสะอาด', 'อากาศถ่ายเทได้สะดวก'] }),
            E2: baseSection({ checked: true, options: ['ปลั๊กไฟปลอดภัย', 'ทางเดินไม่กีดขวาง'] }),
            T1: baseSection({ checked: true, options: ['การทำความสะอาดร่างกาย'], text1: hasWound ? 'เน้นล้างมือก่อนทำแผล' : 'สอนการดูแลทั่วไป' }),
            T2: baseSection({ checked: hasWound, options: hasWound ? ['การทำแผล'] : [], text1: hasWound ? 'เปลี่ยนผ้าปิดแผลตามแผน' : '' }),
            T3: baseSection({ checked: true, options: ['รับประทานยา/มาตามนัด'] }),
            H1: baseSection({ checked: true, options: ['พักผ่อนให้เพียงพอ', 'ออกกำลังกายเหมาะสม'] }),
            O1: baseSection({ checked: true, text1: 'อาการที่ควรมาพบแพทย์', text2: 'เช่น ไข้สูง หอบเหนื่อย ปวดมากขึ้น' }),
            O2: baseSection({ checked: true, options: ['มาตามนัด', 'โทร 1669 เมื่อฉุกเฉิน'], text1: 'ให้เบอร์โทรติดต่อโรงพยาบาล' }),
            O3: baseSection({ checked: true, text1: 'แนะนำช่องทางติดต่อเมื่อมีปัญหา' }),
            Diet1: baseSection({ checked: true, text1: hasDm ? 'อาหารเบาหวาน' : 'อาหารครบ 5 หมู่', text2: hasHeart ? 'ลดเค็ม' : 'สุกสะอาด', text3: hasWound ? 'เพิ่มโปรตีน' : 'เหมาะสมกับโรค', receiver: 'ผู้ป่วยและญาติ' })
        };
    }

    function makeDischargeRecordSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '').toLowerCase();
        const hasHeart = /(heart failure|chf|cardiac)/.test(diagnosis);
        const hasWound = /(ulcer|wound|fracture|post-op)/.test(diagnosis);
        return {
            date: patient?.admitDate || todayStr(),
            exitDate: todayStr(),
            time: '10:30',
            type: 'แพทย์อนุญาต',
            condition: hasHeart ? 'ดีขึ้น' : 'หายสนิท',
            symptom: `สรุปอาการของ ${patient?.name || 'ผู้ป่วย'} ระหว่างจำหน่าย: อาการโดยรวมคงที่ รู้สึกตัวดี`,
            bt: '36.8',
            pr: '80',
            rr: '18',
            bp: '120/80',
            d1: true,
            d2: hasWound,
            d3: false,
            d4: false,
            d_other: false,
            d_other_text: '',
            e1: true,
            e_other: false,
            e_other_text: '',
            t1: true,
            t2: hasWound,
            t_other: false,
            t_other_text: '',
            h_other: true,
            h_other_text: 'พักผ่อนให้เพียงพอ และทำกิจกรรมตามกำลัง',
            diet1: true,
            diet2: true,
            diet3: true,
            diet4: true,
            diet5: hasHeart,
            diet6: false,
            diet7: hasHeart || hasWound,
            diet7_text: hasHeart ? 'low salt' : 'high protein',
            diet_other: false,
            diet_text: '',
            med_status: 'ได้ครบ',
            med_text: '',
            fu_status: 'มีนัด F/U',
            fu_text: 'นัดติดตามอาการตามใบนัด',
            wound_care: hasWound,
            wound_date: hasWound ? todayStr() : '',
            cont_other: false,
            cont_text: '',
            care_loc: 'รพช.',
            care_loc_text1: '',
            care_loc_text2: '',
            care_loc_text3: 'โรงพยาบาลต้นสังกัด',
            care_loc_text4: '',
            care_loc_text5: '',
            receiverName: 'ญาติผู้ป่วย',
            relation: 'บุตร',
            nurseName: DEFAULT_ASSESSOR,
            pos: 'พยาบาลวิชาชีพปฏิบัติการ'
        };
    }

    function makeProgressNotesSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '');
        const needsAssist = /(stroke|hemiplegia|fracture|icu|ventilator|palliative|ulcer|heart failure|pneumonia|diabetic foot)/i.test(diagnosis);
        return [
            nursingNote({
                date: daysAgo(1),
                shift: 'เช้า',
                time: '08:00',
                focus: needsAssist ? 'Safety / Surveillance' : 'General Care',
                s: `${patient?.name || 'ผู้ป่วย'} รู้สึกตัวดี ${diagnosis}`,
                o: 'V/S stable, ไม่มีภาวะแทรกซ้อนเฉียบพลัน',
                i: 'ประเมินอาการต่อเนื่อง จัดสิ่งแวดล้อมปลอดภัย และให้การพยาบาลตามแผน',
                e: 'ผู้ป่วยให้ความร่วมมือดี'
            }),
            nursingNote({
                date: daysAgo(1),
                shift: 'บ่าย',
                time: '14:00',
                focus: needsAssist ? 'Follow-up Care' : 'Education',
                s: 'อาการโดยรวมคงที่',
                o: 'ไม่มีอาการผิดปกติที่ต้องเฝ้าระวังทันที',
                i: 'ทบทวนแผนการดูแลและคำแนะนำแก่ผู้ป่วย/ญาติ',
                e: 'เข้าใจคำแนะนำและสามารถทวนกลับได้'
            })
        ];
    }

    function makeFocusListSeed(patient) {
        const diagnosis = String(patient?.diagnosis || '');
        return [
            focusItem({
                focus: diagnosis.includes('fracture') ? 'Impaired Physical Mobility' : 'Acute/Chronic Condition',
                goal: 'ผู้ป่วยได้รับการดูแลต่อเนื่องและอาการคงที่',
                startDate: daysAgo(2)
            }),
            focusItem({
                focus: diagnosis.includes('stroke') ? 'Risk for Falls' : 'Knowledge Deficit',
                goal: 'ผู้ป่วย/ญาติปฏิบัติตัวได้ถูกต้อง',
                startDate: daysAgo(2)
            })
        ];
    }

    function ensureMapKey(db, key) {
        if (!db[key] || typeof db[key] !== 'object' || Array.isArray(db[key])) db[key] = {};
    }

    function ensureDemoPatientRecords(db) {
        if (!db || typeof db !== 'object') return false;

        ensureMapKey(db, 'patients');
        ensureMapKey(db, 'braden');
        ensureMapKey(db, 'fallRisk');
        ensureMapKey(db, 'classifications');
        ensureMapKey(db, 'classificationsPed');
        ensureMapKey(db, 'nursingNotes');
        ensureMapKey(db, 'focusList');
        ensureMapKey(db, 'nutrition');
        ensureMapKey(db, 'patientEdu');
        ensureMapKey(db, 'dischargeRecord');
        ensureMapKey(db, 'assessmentInitial');
        ensureMapKey(db, 'assessmentPed');
        if (!Array.isArray(db.serviceRequests)) db.serviceRequests = [];

        let changed = false;
        const patients = Object.values(db.patients || {});

        patients.forEach(patient => {
            if (!patient || !patient.an) return;
            const an = patient.an;
            const adultInitial = makeAdultAssessmentSeed(patient);
            const pedInitial = makePediatricAssessmentSeed(patient);
            const adultClass = { evalDate: daysAgo(1), shift: 'เช้า', scores: makeAdultClassificationScores(patient), assessor: DEFAULT_ASSESSOR };
            const pedClass = { evalDate: daysAgo(1), shift: 'เช้า', items: makePediatricClassificationScores(patient), assessor: DEFAULT_ASSESSOR };
            const fallRecord = fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: makeFallScores(patient.latestMorse), maas: patient.latestMaas || 3, assessor: DEFAULT_ASSESSOR });
            const bradenRecordSeed = bradenRecord(an, patient.hn, patient.ward || DEMO_WARD, {
                evalDate: daysAgo(1),
                admitDate: patient.admitDate,
                diagnosis: patient.diagnosis,
                initialUlcer: /ulcer/i.test(String(patient.diagnosis || '')) ? 'มี' : 'ไม่มี',
                initialUlcerDetail: /ulcer/i.test(String(patient.diagnosis || '')) ? 'มีแผลตามแผนการดูแล' : '',
                albumin: /cancer|palliative|ulcer|foot/i.test(String(patient.diagnosis || '').toLowerCase()) ? '3.0' : '3.6',
                hb: '11.0',
                hct: '33',
                bmi: /pediatric/i.test(String(patient.diagnosis || '')) ? '18.5' : '22.0',
                s1: makeBradenScores(patient.latestBraden),
                s3Location: /ulcer/i.test(String(patient.diagnosis || '')) ? 'ตำแหน่งแผลตามบริเวณที่มีปัญหา' : '',
                s3Stage: /ulcer/i.test(String(patient.diagnosis || '')) ? 'Stage II' : '',
                s3Appearance: /ulcer/i.test(String(patient.diagnosis || '')) ? 'ผิวหนังมีรอยแดง/แผลตื้น' : '',
                assessor: DEFAULT_ASSESSOR
            });

            if (!Array.isArray(db.braden[an]) || db.braden[an].length === 0) {
                db.braden[an] = [bradenRecordSeed];
                changed = true;
            }
            if (!Array.isArray(db.fallRisk[an]) || db.fallRisk[an].length === 0) {
                db.fallRisk[an] = [fallRecord];
                changed = true;
            }
            if (!Array.isArray(db.classifications[an]) || db.classifications[an].length === 0) {
                db.classifications[an] = [adultClass];
                changed = true;
            }
            if (!Array.isArray(db.classificationsPed[an]) || db.classificationsPed[an].length === 0) {
                db.classificationsPed[an] = [pedClass];
                changed = true;
            }
            if (!Array.isArray(db.nursingNotes[an]) || db.nursingNotes[an].length === 0) {
                db.nursingNotes[an] = makeProgressNotesSeed(patient);
                changed = true;
            }
            if (!Array.isArray(db.focusList[an]) || db.focusList[an].length === 0) {
                db.focusList[an] = makeFocusListSeed(patient);
                changed = true;
            }
            if (!db.patientEdu[an] || Object.keys(db.patientEdu[an]).length === 0) {
                db.patientEdu[an] = makePatientEduSeed(patient);
                changed = true;
            } else {
                db.patientEdu[an] = { ...makePatientEduSeed(patient), ...db.patientEdu[an] };
                changed = true;
            }
            if (!db.dischargeRecord[an] || Object.keys(db.dischargeRecord[an]).length === 0) {
                db.dischargeRecord[an] = makeDischargeRecordSeed(patient);
                changed = true;
            } else {
                db.dischargeRecord[an] = { ...makeDischargeRecordSeed(patient), ...db.dischargeRecord[an] };
                changed = true;
            }
            if (!db.assessmentInitial[an] || Object.keys(db.assessmentInitial[an]).length === 0) {
                db.assessmentInitial[an] = adultInitial;
                changed = true;
            } else {
                db.assessmentInitial[an] = { ...adultInitial, ...db.assessmentInitial[an] };
                changed = true;
            }
            if (!db.assessmentPed[an] || Object.keys(db.assessmentPed[an]).length === 0) {
                db.assessmentPed[an] = pedInitial;
                changed = true;
            } else {
                db.assessmentPed[an] = { ...pedInitial, ...db.assessmentPed[an] };
                changed = true;
            }
        });

        return changed;
    }

    // ==========================================================================
    // 4. "ฐานข้อมูลจำลอง" ทั้งหมด — เก็บใน localStorage เพื่อให้ข้อมูลที่พยาบาล
    //    ทดลองบันทึกระหว่างสาธิต ยังอยู่ครบแม้ปิด/เปิดเบราว์เซอร์ใหม่
    // ==========================================================================
    function loadDB() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (ensureDemoPatientRecords(parsed)) {
                    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                }
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return buildFreshDB();
    }

    function buildFreshDB() {
        const patients = {};
        SEED_PATIENTS.forEach(p => { patients[p.an] = { ...p }; });

        const db = {
            patients,
            braden: {}, fallRisk: {}, classifications: {}, classificationsPed: {},
            nursingNotes: {}, focusList: {}, nutrition: {}, patientEdu: {},
            dischargeRecord: {}, assessmentInitial: {}, assessmentPed: {},
            serviceRequests: [],
        };

        const P = {}; SEED_PATIENTS.forEach(p => { P[p.an] = p; });

        // ---------------- 68000101: Stroke — เสี่ยงล้มสูง/แผลกดทับ (hero case) ----------------
        (function () {
            const an = '68000101', p = P[an];
            db.braden[an] = [
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(3), admitDate: p.admitDate, diagnosis: p.diagnosis, initialUlcer: 'ไม่มี', albumin: '3.4', hb: '11.2', hct: '34', bmi: '22.1', s1: [2, 3, 2, 2, 2, 2], assessor: DEFAULT_ASSESSOR }),
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, initialUlcer: 'ไม่มี', albumin: '3.2', hb: '10.9', hct: '33', bmi: '22.1', s1: [2, 2, 2, 2, 2, 1], assessor: DEFAULT_ASSESSOR }),
            ];
            db.fallRisk[an] = [
                fallRiskRecord({ evalDate: daysAgo(3), shift: 'เช้า', m: [25, 15, 15, 0, 10, 0], maas: 2 }),
                fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [25, 15, 15, 0, 10, 0], maas: 2 }),
            ];
            db.classifications[an] = [
                classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [3, 3, 2, 3, 2, 3, 2, 2] }),
            ];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '08:00', focus: 'Risk for Falls', s: 'ผู้ป่วยรู้สึกตัวดี พูดช้า แขนขาขวาอ่อนแรง Grade 3', o: 'V/S: BT 36.8, PR 82, RR 18, BP 138/82, Morse Score 65 (เสี่ยงสูง)', i: 'ล็อกล้อเตียง ยกไม้กั้นเตียงขึ้นสูงสุดทั้ง 2 ข้าง วางกริ่งสัญญาณให้หยิบง่าย แนะนำญาติเฝ้าไข้ตลอด 24 ชม. ทำ Passive ROM แขนขาขวา', e: 'ผู้ป่วยและญาติเข้าใจและให้ความร่วมมือดี ไม่มีอุบัติเหตุพลัดตกหกล้ม' }),
                nursingNote({ date: daysAgo(1), shift: 'บ่าย', time: '14:30', focus: 'Impaired Physical Mobility', s: '-', o: 'Muscle power แขนขวา Grade 3, ขาขวา Grade 3, แขนขาซ้ายปกติ', i: 'จัดท่านอนตะแคงสลับทุก 2 ชม. ทำกายภาพบำบัดตามแผน PT', e: 'ผิวหนังไม่มีรอยแดงกดทับ ผู้ป่วยขยับแขนขาข้างขวาได้เล็กน้อยขึ้น' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Risk for Falls', goal: 'ผู้ป่วยปลอดภัยจากการพลัดตกหกล้มตลอดการรักษาตัวใน รพ.', startDate: daysAgo(6) }),
                focusItem({ focus: 'Impaired Physical Mobility', goal: 'ผู้ป่วยไม่เกิดภาวะแทรกซ้อนจากการนอนนาน กล้ามเนื้อไม่ลีบ', startDate: daysAgo(6) }),
                focusItem({ focus: 'Risk for Impaired Skin Integrity', goal: 'ผิวหนังไม่เกิดแผลกดทับตลอดการรักษาตัวใน รพ.', startDate: daysAgo(6) }),
            ];
        })();

        // ---------------- 68000102: พระอาพาธ ปอดอักเสบ ----------------
        (function () {
            const an = '68000102', p = P[an];
            db.braden[an] = [
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, s1: [3, 3, 3, 3, 3, 2], assessor: DEFAULT_ASSESSOR }),
            ];
            db.fallRisk[an] = [
                fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [0, 15, 15, 0, 0, 0], maas: 3 }),
            ];
            db.classifications[an] = [
                classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [2, 3, 2, 2, 2, 3, 2, 2] }),
            ];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '07:45', focus: 'Ineffective Airway Clearance', s: 'ไอมีเสมหะเหนียวข้น หายใจลำบากเล็กน้อย', o: 'V/S: BT 37.9, PR 96, RR 24, BP 132/80, SpO2 94% room air, ฟังปอดมี Crepitation ทั้งสองข้าง', i: 'On O2 Cannula 3 LPM, จัดท่านอนศีรษะสูง 30-45 องศา สอนไอแบบมีประสิทธิภาพ ดูดเสมหะเมื่อจำเป็น ให้ยาปฏิชีวนะตามแผนการรักษา', e: 'SpO2 ดีขึ้นเป็น 96% หลังให้ O2 หายใจสุขสบายขึ้น' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Ineffective Airway Clearance', goal: 'ทางเดินหายใจโล่ง ไม่มีเสียง Crepitation SpO2 ≥ 95%', startDate: daysAgo(3) }),
                focusItem({ focus: 'Imbalanced Nutrition (DM control)', goal: 'ระดับน้ำตาลในเลือดอยู่ในเกณฑ์ที่เหมาะสม (DTX 80-180 mg/dL)', startDate: daysAgo(3) }),
            ];
            db.patientEdu[an] = { D1: { checked: true, text: 'แนะนำการรับประทานอาหารสำหรับผู้ป่วยเบาหวาน งดของหวาน', date: daysAgo(1), provider: DEFAULT_ASSESSOR, pos: 'พยาบาลวิชาชีพปฏิบัติการ', receiver: 'ผู้ป่วย' }, M1: { checked: true, text: 'แนะนำการรับประทานยาปฏิชีวนะให้ครบตามแผนการรักษา', date: daysAgo(1), provider: DEFAULT_ASSESSOR, pos: 'พยาบาลวิชาชีพปฏิบัติการ', receiver: 'ผู้ป่วย' } };
        })();

        // ---------------- 68000103: หลังผ่าตัดไส้ติ่ง ----------------
        (function () {
            const an = '68000103', p = P[an];
            db.braden[an] = [bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, s1: [4, 4, 3, 3, 4, 2], assessor: DEFAULT_ASSESSOR })];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [0, 15, 0, 0, 0, 0], maas: 4 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [2, 2, 1, 2, 1, 2, 1, 1] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'บ่าย', time: '13:00', focus: 'Acute Pain', s: 'ปวดแผลผ่าตัดบริเวณท้องน้อยขวา Pain Score 6/10', o: 'V/S stable, แผลผ่าตัดแห้งดี ไม่มีเลือดซึม Dressing สะอาด', i: 'ให้ยาแก้ปวดตามแผนการรักษา ประเมิน Pain Score ซ้ำหลังให้ยา 30 นาที แนะนำการพลิกตัว/ลุกเดินเบาๆ', e: 'หลังให้ยา Pain Score ลดลงเหลือ 3/10 ผู้ป่วยสุขสบายขึ้น' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Acute Pain', goal: 'ผู้ป่วยปวดลดลง ระดับ Pain Score ≤ 3 ภายใน 24 ชม.', startDate: daysAgo(1) }),
                focusItem({ focus: 'Risk for Infection (Surgical Wound)', goal: 'แผลผ่าตัดไม่ติดเชื้อ แห้งสนิทก่อนจำหน่าย', startDate: daysAgo(1) }),
            ];
        })();

        // ---------------- 68000104: เบาหวานแผลที่เท้า (hero: Braden + Nutrition) ----------------
        (function () {
            const an = '68000104', p = P[an];
            db.braden[an] = [
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(3), admitDate: p.admitDate, diagnosis: p.diagnosis, initialUlcer: 'มี', initialUlcerDetail: 'แผลที่ฝ่าเท้าขวา ขนาด 3x2 ซม.', albumin: '2.9', hb: '10.1', hct: '31', bmi: '27.4', s1: [2, 2, 2, 3, 2, 2], s3Location: 'ฝ่าเท้าขวา', s3Stage: 'Stage II', s3Appearance: 'มีเนื้อตาย (Slough) เล็กน้อย ขอบแผลแดง', assessor: DEFAULT_ASSESSOR }),
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, initialUlcer: 'มี', initialUlcerDetail: 'แผลที่ฝ่าเท้าขวา ขนาดเล็กลงเป็น 2.5x1.5 ซม.', albumin: '3.0', hb: '10.4', hct: '32', bmi: '27.4', s1: [2, 2, 2, 3, 2, 2], s3Location: 'ฝ่าเท้าขวา', s3Stage: 'Stage II', s3Appearance: 'เนื้อเยื่อสีชมพู เริ่มมี Granulation', assessor: DEFAULT_ASSESSOR }),
            ];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [0, 15, 15, 0, 10, 0], maas: 3 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [2, 2, 2, 2, 3, 2, 3, 2] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '09:00', focus: 'Impaired Skin Integrity', s: 'แผลที่เท้าเริ่มเจ็บน้อยลง', o: 'แผลฝ่าเท้าขวาขนาด 2.5x1.5 ซม. มี Granulation tissue สีชมพู ไม่มีหนอง DTX ก่อนอาหารเช้า 168 mg/dL', i: 'ทำแผลด้วย Normal Saline ปิดแผลด้วย Hydrocolloid dressing ทุกวัน เจาะ DTX 4 ครั้ง/วันตามแผนการรักษา ให้ Insulin ตามคำสั่งแพทย์', e: 'แผลมีแนวโน้มดีขึ้น ขนาดแผลเล็กลงจากครั้งก่อน ผู้ป่วยให้ความร่วมมือดี' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Impaired Skin Integrity', goal: 'แผลที่เท้ามีขนาดเล็กลง ไม่มีการติดเชื้อเพิ่มเติม', startDate: daysAgo(9) }),
                focusItem({ focus: 'Risk for Infection', goal: 'ไม่มีอาการแสดงของการติดเชื้อที่แผล (ไข้, หนอง, กลิ่นเหม็น)', startDate: daysAgo(9) }),
                focusItem({ focus: 'Imbalanced Nutrition (Wound healing)', goal: 'ได้รับสารอาหารเพียงพอต่อการหายของแผล Albumin ≥ 3.5 g/dL', startDate: daysAgo(9) }),
            ];
            db.nutrition[an] = {
                diagnosis: p.diagnosis, currentWeight: '78', usualWeight: '82', height: '168',
                bmi: '27.4', weightLossPercent: '4.9', albumin: '3.0',
                appetiteStatus: 'ลดลงเล็กน้อย', dietType: 'อาหารเบาหวาน (Diabetic Diet) 1,600 kcal/วัน',
                nutritionRisk: 'มีความเสี่ยงปานกลาง (Moderate Risk) เนื่องจากมีแผลเรื้อรังและ Albumin ต่ำ',
                plan: 'ปรึกษาโภชนากรเพิ่มโปรตีนในมื้ออาหาร ติดตาม Albumin ซ้ำใน 1 สัปดาห์',
                assessor: DEFAULT_ASSESSOR, evalDate: daysAgo(1)
            };
        })();

        // ---------------- 68000105: เด็กท้องเสีย (Pediatric classification) ----------------
        (function () {
            const an = '68000105', p = P[an];
            db.classificationsPed[an] = [
                classificationPedRecord({ evalDate: daysAgo(1), shift: 'เช้า', items: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1] }),
            ];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '10:00', focus: 'Deficient Fluid Volume', s: 'มารดาให้ประวัติเด็กถ่ายเหลว 5 ครั้ง/วัน อาเจียน 2 ครั้ง', o: 'V/S: BT 37.5, PR 110, RR 26, ริมฝีปากแห้งเล็กน้อย Skin turgor ปกติ On IV Fluid 5%D/N/2 rate 40 ml/hr', i: 'ติดตาม Intake-Output ทุก 8 ชม. ชั่งน้ำหนักทุกวัน ให้ ORS จิบทีละน้อยบ่อยๆ ตามที่ทนได้', e: 'เด็กอาการดีขึ้น ถ่ายเหลวลดลงเหลือ 2 ครั้ง ดื่มนมได้ตามปกติ' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Deficient Fluid Volume', goal: 'เด็กไม่มีภาวะขาดน้ำ Skin turgor ปกติ ปัสสาวะออกดี', startDate: daysAgo(2) }),
            ];
        })();

        // ---------------- 68000106: มะเร็งระยะท้าย ประคับประคอง (hero: nursing notes) ----------------
        (function () {
            const an = '68000106', p = P[an];
            db.braden[an] = [
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(2), admitDate: p.admitDate, diagnosis: p.diagnosis, albumin: '2.6', hb: '9.4', hct: '29', bmi: '18.9', s1: [1, 2, 1, 2, 2, 1], assessor: DEFAULT_ASSESSOR }),
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, albumin: '2.5', hb: '9.2', hct: '28', bmi: '18.6', s1: [1, 2, 1, 2, 2, 1], assessor: DEFAULT_ASSESSOR }),
            ];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'ดึก', m: [0, 15, 30, 0, 10, 0], maas: 1 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'บ่าย', scores: [4, 4, 3, 4, 3, 4, 3, 3] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(2), shift: 'บ่าย', time: '15:00', focus: 'Acute Pain', s: 'ปวดร้าวบริเวณหลังและสะโพก Pain Score 7/10 ผู้ป่วยบ่นเหนื่อยล้า', o: 'V/S: BT 37.1, PR 88, RR 20, BP 108/68 sedate เล็กน้อยหลังให้ยา', i: 'ให้ Morphine ตามแผนการรักษาแบบ Palliative Care จัดท่านอนสุขสบาย ประคับประคองด้านจิตใจ เปิดโอกาสให้ครอบครัวอยู่เป็นเพื่อน', e: 'Pain Score ลดลงเหลือ 3/10 ผู้ป่วยหลับพักได้' }),
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '08:30', focus: 'Anxiety / Family Coping', s: 'ผู้ป่วยและครอบครัวแสดงความกังวลเรื่องการพยากรณ์โรค', o: 'ผู้ป่วยรู้สึกตัวดี พูดคุยรู้เรื่อง มีสีหน้าวิตกกังวล ครอบครัวมาเยี่ยมสม่ำเสมอ', i: 'เปิดโอกาสให้ผู้ป่วยและครอบครัวได้พูดคุยระบายความรู้สึก ประสานทีมสหวิชาชีพ (แพทย์, นักสังคมสงเคราะห์) ร่วมวางแผนการดูแลแบบประคับประคอง', e: 'ผู้ป่วยและครอบครัวรู้สึกผ่อนคลายขึ้นหลังได้พูดคุย เข้าใจแผนการดูแลมากขึ้น' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Acute/Chronic Pain', goal: 'ผู้ป่วยปวดลดลงอยู่ในระดับที่ทนได้ (Pain Score ≤ 4)', startDate: daysAgo(14) }),
                focusItem({ focus: 'Impaired Skin Integrity (Risk)', goal: 'ผิวหนังไม่เกิดแผลกดทับ เนื่องจากนอนติดเตียงเป็นเวลานาน', startDate: daysAgo(14) }),
                focusItem({ focus: 'Anxiety / Ineffective Family Coping', goal: 'ผู้ป่วยและครอบครัวสามารถปรับตัวและเผชิญความเจ็บป่วยได้อย่างเหมาะสม', startDate: daysAgo(10) }),
            ];
        })();

        // ---------------- 68000107: กระดูกขาหักรอผ่าตัด (hero: Fall risk) ----------------
        (function () {
            const an = '68000107', p = P[an];
            db.braden[an] = [bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, s1: [3, 3, 2, 2, 3, 2], assessor: DEFAULT_ASSESSOR })];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [25, 15, 30, 0, 0, 0], maas: 3 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [3, 3, 2, 3, 3, 3, 2, 2] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '08:15', focus: 'Risk for Falls', s: 'ปวดขาขวาบริเวณกระดูกหัก Pain Score 6/10 เดินลงน้ำหนักขาขวาไม่ได้', o: 'V/S stable, ขาขวา Splint ไว้ชั่วคราว รอผ่าตัด ORIF พรุ่งนี้ Morse Score 70 (เสี่ยงสูงมาก)', i: 'ล็อกล้อเตียง ยกไม้กั้นเตียง ห้ามลุกเดินเองโดยเด็ดขาด แนะนำใช้กริ่งเรียกทุกครั้งที่ต้องการช่วยเหลือ NPO เตรียมผ่าตัด', e: 'ผู้ป่วยและญาติเข้าใจและปฏิบัติตามคำแนะนำ ไม่มีอุบัติเหตุเกิดขึ้น' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Risk for Falls', goal: 'ผู้ป่วยปลอดภัยจากการพลัดตกหกล้มก่อน-หลังผ่าตัด', startDate: daysAgo(1) }),
                focusItem({ focus: 'Acute Pain', goal: 'ผู้ป่วยปวดลดลงระดับที่ทนได้ระหว่างรอผ่าตัด', startDate: daysAgo(1) }),
            ];
        })();

        // ---------------- 68000108: ไข้สังเกตอาการ ความเสี่ยงต่ำ ----------------
        (function () {
            const an = '68000108', p = P[an];
            db.braden[an] = [bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, s1: [4, 4, 4, 3, 4, 2], assessor: DEFAULT_ASSESSOR })];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [0, 0, 0, 0, 10, 0], maas: 4 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [1, 1, 1, 2, 1, 1, 1, 1] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '08:00', focus: 'Hyperthermia', s: 'มีไข้ ปวดเมื่อยตามตัว', o: 'V/S: BT 38.6, PR 92, RR 20, BP 110/70', i: 'เช็ดตัวลดไข้ ให้ยาลดไข้ตามแผนการรักษา เจาะ Lab CBC, NS1 Ag ตามแผนการรักษา ดื่มน้ำมากๆ', e: 'ไข้ลดลงเป็น 37.4 องศา หลังเช็ดตัวและให้ยา' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Hyperthermia', goal: 'อุณหภูมิร่างกายอยู่ในเกณฑ์ปกติ (36.5-37.5°C)', startDate: daysAgo(1) }),
            ];
        })();

        // ---------------- 68000109: ICU ใส่ท่อช่วยหายใจ (hero: MAAS/Braden สูงสุด) ----------------
        (function () {
            const an = '68000109', p = P[an];
            db.braden[an] = [
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(2), admitDate: p.admitDate, diagnosis: p.diagnosis, albumin: '2.8', hb: '10.8', hct: '33', bmi: '23.5', s1: [1, 1, 1, 2, 2, 1], assessor: DEFAULT_ASSESSOR }),
                bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, albumin: '2.9', hb: '10.6', hct: '32', bmi: '23.5', s1: [1, 1, 1, 2, 2, 1], assessor: DEFAULT_ASSESSOR }),
            ];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'ดึก', m: [0, 15, 0, 20, 10, 0], maas: 5 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'ดึก', scores: [4, 4, 4, 4, 3, 4, 3, 3] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'ดึก', time: '02:00', focus: 'Ineffective Breathing Pattern', s: '-', o: 'On Ventilator mode SIMV, RR set 16, SpO2 98%, ETT fixed 22 cm ที่มุมปาก, Foley catheter urine ออก 60 ml/hr', i: 'Suction ทางเดินหายใจ PRN ดูแลความชุ่มชื้นในปาก พลิกตะแคงตัวทุก 2 ชม. ประเมิน Sedation score ตามแผนการรักษา', e: 'V/S stable, ไม่มี Self-extubation, ผิวหนังไม่มีรอยกดทับ' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Ineffective Breathing Pattern', goal: 'ผู้ป่วยได้รับออกซิเจนเพียงพอ SpO2 ≥ 95% ไม่มีภาวะแทรกซ้อนจากเครื่องช่วยหายใจ', startDate: daysAgo(4) }),
                focusItem({ focus: 'Risk for Self-Extubation', goal: 'ท่อช่วยหายใจและสายต่างๆ อยู่ในตำแหน่งที่เหมาะสมตลอดเวลา', startDate: daysAgo(4) }),
                focusItem({ focus: 'Risk for Impaired Skin Integrity', goal: 'ผิวหนังไม่เกิดแผลกดทับจากการนอนติดเตียงต่อเนื่อง', startDate: daysAgo(4) }),
            ];
        })();

        // ---------------- 68000110: หัวใจล้มเหลว เตรียมจำหน่าย (hero: Discharge + Edu) ----------------
        (function () {
            const an = '68000110', p = P[an];
            db.braden[an] = [bradenRecord(an, p.hn, DEMO_WARD, { evalDate: daysAgo(1), admitDate: p.admitDate, diagnosis: p.diagnosis, s1: [3, 4, 3, 3, 3, 3], assessor: DEFAULT_ASSESSOR })];
            db.fallRisk[an] = [fallRiskRecord({ evalDate: daysAgo(1), shift: 'เช้า', m: [0, 0, 0, 0, 20, 0], maas: 3 })];
            db.classifications[an] = [classificationRecord({ evalDate: daysAgo(1), shift: 'เช้า', scores: [2, 2, 1, 2, 2, 2, 1, 1] })];
            db.nursingNotes[an] = [
                nursingNote({ date: daysAgo(1), shift: 'เช้า', time: '09:30', focus: 'Discharge Planning', s: 'ผู้ป่วยรู้สึกตัวดี หายใจสุขสบาย ไม่มีอาการเหนื่อยขณะพัก', o: 'V/S stable, น้ำหนักตัวคงที่ 2 วันติดต่อกัน ไม่มีขาบวม Lung clear', i: 'เตรียมความพร้อมก่อนจำหน่าย สอนสังเกตอาการเหนื่อย/บวม การจำกัดน้ำและเกลือ การรับประทานยาต่อเนื่องที่บ้าน นัดติดตามอาการ', e: 'ผู้ป่วยและญาติเข้าใจแผนการดูแลตนเองที่บ้านดี พร้อมจำหน่ายวันพรุ่งนี้' }),
            ];
            db.focusList[an] = [
                focusItem({ focus: 'Decreased Cardiac Output', goal: 'อาการคงที่ ไม่มีภาวะหัวใจล้มเหลวกำเริบ', startDate: daysAgo(7), endDate: daysAgo(1) }),
                focusItem({ focus: 'Knowledge Deficit (Discharge Planning)', goal: 'ผู้ป่วยและญาติสามารถดูแลตนเองที่บ้านได้ถูกต้องหลังจำหน่าย', startDate: daysAgo(2) }),
            ];
            db.patientEdu[an] = {
                D1: { checked: true, text: 'แนะนำการจำกัดปริมาณน้ำดื่มไม่เกิน 1,500 มล./วัน และลดอาหารเค็ม', date: daysAgo(1), provider: DEFAULT_ASSESSOR, pos: 'พยาบาลวิชาชีพปฏิบัติการ', receiver: 'ผู้ป่วยและญาติ' },
                M1: { checked: true, text: 'แนะนำรับประทานยาโรคหัวใจต่อเนื่องตามแพทย์สั่ง ห้ามหยุดยาเอง', date: daysAgo(1), provider: DEFAULT_ASSESSOR, pos: 'พยาบาลวิชาชีพปฏิบัติการ', receiver: 'ผู้ป่วยและญาติ' },
                O1: { checked: true, text: 'สอนสังเกตอาการเหนื่อยง่าย ขาบวม น้ำหนักเพิ่มขึ้นเร็วผิดปกติ ให้รีบมาพบแพทย์', date: daysAgo(1), provider: DEFAULT_ASSESSOR, pos: 'พยาบาลวิชาชีพปฏิบัติการ', receiver: 'ผู้ป่วยและญาติ' },
            };
            db.dischargeRecord[an] = {
                dischargeType: 'จำหน่ายตามแผนการรักษา (Home)', dischargeDate: todayStr(),
                dischargeCondition: 'อาการทั่วไปดีขึ้น รู้สึกตัวดี Vital Signs คงที่',
                medicationSummary: 'Furosemide 40 mg เช้า, Enalapril 5 mg เช้า-เย็น, Aspirin 81 mg เช้า',
                followUpPlan: 'นัดติดตามอาการที่แผนกอายุรกรรม ภายใน 7-14 วัน',
                educationGiven: 'สอนการจำกัดน้ำ-เกลือ, สังเกตอาการเหนื่อย/บวม, การรับประทานยาต่อเนื่อง',
                assessor: DEFAULT_ASSESSOR
            };
        })();

        ensureDemoPatientRecords(db);
        return db;
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
    // 5. Helper เล็กๆ
    // ==========================================================================
    function ensureArr(obj, an) {
        if (!obj[an]) obj[an] = [];
        return obj[an];
    }
    function ok(extra) { return Object.assign({ status: 'success' }, extra || {}); }
    function fail(message) { return { status: 'error', message: message || 'เกิดข้อผิดพลาด (โหมดสาธิต)' }; }
    function saveWhole(resKey, an, value) {
        if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
        DB[resKey][an] = value;
        persist();
        return ok();
    }

    // ==========================================================================
    // 6. ตัวจัดการคำขอ (Router) — คืนค่า Object ธรรมดา ไม่ใช่ Response
    // ==========================================================================
    function handleAction(action, payload, queryParams) {
        payload = payload || {};
        const an = queryParams.get('an') || payload.an || payload.AN;

        // ---- Auth ----
        if (action === 'loginUser') {
            const u = String(payload.username || '').trim().toLowerCase();
            const pw = String(payload.password || '');
            if (u === DEMO_USERNAME && pw === DEMO_PASSWORD) {
                return ok({
                    message: 'เข้าสู่ระบบสำเร็จ',
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
            return Object.values(DB.patients).filter(p => !ward || p.ward === ward);
        }
        if (action === 'getBeds') {
            return ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'สงฆ์-1', 'สงฆ์-2', 'เด็ก-1', 'เด็ก-2', 'ICU-1', 'ICU-2'];
        }
        if (action === 'getFocusTemplates') return FOCUS_TEMPLATES;
        if (action === 'getNursingTemplates') return NURSING_TEMPLATES;
        if (action === 'saveFocusTemplate') {
            FOCUS_TEMPLATES.push({ id: Date.now(), problemName: payload.problemName || '', focus: payload.focus || '', goal: payload.goal || '' });
            return ok();
        }
        if (action === 'saveNursingTemplate') {
            NURSING_TEMPLATES.push({ id: Date.now(), name: payload.name || '', s: payload.s || '', o: payload.o || '', i: payload.i || '', e: payload.e || '' });
            return ok();
        }

        // ---- Service requests ----
        if (action === 'createServiceRequest') {
            const rec = { id: Date.now(), status: 'รอดำเนินการ', ...payload };
            DB.serviceRequests.push(rec);
            persist();
            return ok({ id: rec.id });
        }
        if (action === 'getServiceRequests') return DB.serviceRequests;
        if (action === 'updateServiceRequestStatus') {
            const item = DB.serviceRequests.find(r => String(r.id) === String(payload.id));
            if (item) { item.status = payload.status || item.status; persist(); return ok(); }
            return fail('ไม่พบรายการ');
        }

        // ---- Discharge flow (patient-level fields) ----
        if (action === 'dischargePatient') {
            const p = DB.patients[an];
            if (p) { p.dischargeDate = payload.dischargeDate || todayStr(); p.discharged = true; persist(); }
            return ok();
        }
        if (action === 'undoDischargePatient') {
            const p = DB.patients[an];
            if (p) { delete p.dischargeDate; p.discharged = false; persist(); }
            return ok();
        }
        if (action === 'searchDischargedPatients') {
            return Object.values(DB.patients).filter(p => p.discharged);
        }

        // ---- Braden Scale (PascalCase, upsert ตาม EvalDate) ----
        if (action === 'getBradenScale') return ensureArr(DB.braden, an).slice();
        if (action === 'saveBradenScale') {
            if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
            const list = ensureArr(DB.braden, an);
            if (payload.isSummaryOnly) {
                if (list.length === 0) return fail('ไม่พบประวัติการประเมินแผลกดทับของผู้ป่วยรายนี้ จึงไม่สามารถบันทึกสรุปได้');
                const last = list[list.length - 1];
                Object.assign(last, {
                    S4_DischargeDate: payload.s4_dischargeDate || '', S4_Outcome: payload.s4_outcome || '',
                    S4_UlcerDate: payload.s4_ulcerDate || '', S4_Location: payload.s4_location || '',
                    S4_Size: payload.s4_size || '', S4_Appearance: payload.s4_appearance || '',
                    S4_Stage: payload.s4_stage || '', S4_Count: payload.s4_count || ''
                });
                persist();
                return ok({ message: 'บันทึกสรุปการเกิดแผลกดทับลงในข้อมูลล่าสุดเรียบร้อย' });
            }
            const record = {
                Timestamp: isoNow(), AN: an, HN: payload.hn || '', Ward: payload.ward || '',
                EvalDate: payload.evalDate, AdmitDate: payload.admitDate || '', TransferDate: payload.transferDate || '',
                FromWard: payload.fromWard || '', FirstEvalDate: payload.firstEvalDate || '',
                Diagnosis: payload.diagnosis || '', InitialUlcer: payload.initialUlcer || '', InitialUlcerDetail: payload.initialUlcerDetail || '',
                Albumin: payload.albumin || '', Hb: payload.hb || '', Hct: payload.hct || '', BMI: payload.bmi || '',
                S1_M1: payload.s1_m1 || 0, S1_M2: payload.s1_m2 || 0, S1_M3: payload.s1_m3 || 0,
                S1_M4: payload.s1_m4 || 0, S1_M5: payload.s1_m5 || 0, S1_M6: payload.s1_m6 || 0,
                TotalScore: payload.totalScore || 0,
                S3_Location: payload.s3_location || '', S3_Stage: payload.s3_stage || '', S3_Appearance: payload.s3_appearance || '',
                Assessor: payload.assessor || '',
                S4_DischargeDate: payload.s4_dischargeDate || '', S4_Outcome: payload.s4_outcome || '',
                S4_UlcerDate: payload.s4_ulcerDate || '', S4_Location: payload.s4_location || '',
                S4_Size: payload.s4_size || '', S4_Appearance: payload.s4_appearance || '',
                S4_Stage: payload.s4_stage || '', S4_Count: payload.s4_count || ''
            };
            const idx = list.findIndex(r => r.EvalDate === record.EvalDate);
            if (idx >= 0) list[idx] = record; else list.push(record);
            persist();
            return ok();
        }

        // ---- Fall Risk (Morse/MAAS, lowercase, upsert ตาม evalDate+shift) ----
        if (action === 'getFallRisk') return ensureArr(DB.fallRisk, an).slice();
        if (action === 'saveFallRisk' || action === 'saveFallRiskSingle') {
            if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
            const list = ensureArr(DB.fallRisk, an);
            const record = {
                evalDate: payload.evalDate, shift: payload.shift,
                m1: payload.m1 ?? '', m2: payload.m2 ?? '', m3: payload.m3 ?? '',
                m4: payload.m4 ?? '', m5: payload.m5 ?? '', m6: payload.m6 ?? '',
                morseTotal: payload.morseTotal ?? '', maasScore: payload.maasScore ?? '',
                assessor: payload.assessor || '', timestamp: isoNow()
            };
            const idx = list.findIndex(r => r.evalDate === record.evalDate && r.shift === record.shift);
            if (idx >= 0) list[idx] = record; else list.push(record);
            persist();
            return ok();
        }
        if (action === 'deleteFallRisk') {
            const list = ensureArr(DB.fallRisk, an);
            DB.fallRisk[an] = list.filter(r => !(r.evalDate === payload.evalDate && r.shift === payload.shift));
            persist();
            return ok();
        }

        // ---- Classification ผู้ป่วยผู้ใหญ่ (lowercase, scores[8]) ----
        if (action === 'getClassifications') return ensureArr(DB.classifications, an).slice();
        if (action === 'saveClassification' || action === 'saveClassificationSingle') {
            if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
            const list = ensureArr(DB.classifications, an);
            const scores = Array.isArray(payload.scores) ? payload.scores
                : [payload.q1, payload.q2, payload.q3, payload.q4, payload.q5, payload.q6, payload.q7, payload.q8];
            const record = { evalDate: payload.evalDate, shift: payload.shift, scores, total: payload.total, category: payload.category, assessor: payload.assessor || '', timestamp: isoNow() };
            const idx = list.findIndex(r => r.evalDate === record.evalDate && r.shift === record.shift);
            if (idx >= 0) list[idx] = record; else list.push(record);
            persist();
            return ok();
        }
        if (action === 'deleteClassification') {
            const list = ensureArr(DB.classifications, an);
            DB.classifications[an] = list.filter(r => !(r.evalDate === payload.evalDate && r.shift === payload.shift));
            persist();
            return ok();
        }

        // ---- Classification ผู้ป่วยเด็ก ----
        if (action === 'getClassificationsPed') return ensureArr(DB.classificationsPed, an).slice();
        if (action === 'saveClassificationPed') {
            if (!an) return fail('ไม่พบเลข AN ของผู้ป่วย');
            const list = ensureArr(DB.classificationsPed, an);
            const record = {
                an, ward: payload.ward || '', bed: payload.bed || '',
                evalDate: payload.evalDate || payload.date, shift: payload.shift,
                score: payload.score, classType: payload.classType, assessor: payload.assessor || '',
                formData: payload.formData || {},
                scores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (payload.formData || {})['item' + n] ?? ''),
                timestamp: isoNow()
            };
            const idx = list.findIndex(r => r.evalDate === record.evalDate && r.shift === record.shift);
            if (idx >= 0) list[idx] = record; else list.push(record);
            persist();
            return ok();
        }
        if (action === 'deleteClassificationPed') {
            const list = ensureArr(DB.classificationsPed, an);
            DB.classificationsPed[an] = list.filter(r => !(r.evalDate === payload.evalDate && r.shift === payload.shift));
            persist();
            return ok();
        }

        // ---- Nursing Progress Note (แทนที่ทั้งชุดทุกครั้งที่บันทึก) ----
        if (action === 'getNursingNotes') return ensureArr(DB.nursingNotes, an).slice();
        if (action === 'saveNursingNotes') return saveWhole('nursingNotes', an, Array.isArray(payload.noteData) ? payload.noteData : []);

        // ---- Focus List (แทนที่ทั้งชุดทุกครั้งที่บันทึก) ----
        if (action === 'getFocusList') return ensureArr(DB.focusList, an).slice();
        if (action === 'saveFocusList') return saveWhole('focusList', an, Array.isArray(payload.focusData) ? payload.focusData : []);

        // ---- Patient Education / Nutrition / Discharge / Assessment (เก็บเป็นก้อน JSON เดียว) ----
        if (action === 'getPatientEdu') return DB.patientEdu[an] || {};
        if (action === 'savePatientEdu') return saveWhole('patientEdu', an, payload.formData || {});

        if (action === 'getNutritionAssessment') return DB.nutrition[an] || null;
        if (action === 'saveNutritionAssessment') return saveWhole('nutrition', an, payload.formData || {});

        if (action === 'getDischargeRecord') return DB.dischargeRecord[an] || null;
        if (action === 'saveDischargeRecord') return saveWhole('dischargeRecord', an, payload.formData || {});
        if (action === 'saveDischargeDate') {
            const p = DB.patients[an];
            if (p) { p.dischargeDate = payload.dischargeDate || todayStr(); persist(); }
            return ok();
        }

        if (action === 'getAssessmentInitial') return DB.assessmentInitial[an] || null;
        if (action === 'saveAssessmentInitial') return saveWhole('assessmentInitial', an, payload.formData || {});
        if (action === 'getAssessmentPed') return DB.assessmentPed[an] || null;
        if (action === 'saveAssessmentPed') return saveWhole('assessmentPed', an, payload.formData || {});

        // ---- Fallback: ไม่รู้จัก action นี้ ----
        console.warn('[Demo Mock API] Unhandled action:', action, payload);
        return fail(`โหมดสาธิตยังไม่รองรับคำสั่งนี้ (${action || 'unknown'})`);
    }

    // ==========================================================================
    // 7. ดัก window.fetch
    //    (ก) ปลายทาง Google Apps Script (API_URL เดิม) -> ข้อมูลผู้ป่วย/บันทึกต่างๆ ยังคงจำลองทั้งหมดเหมือนเดิม
    //    (ข) ปลายทาง Supabase Edge Function "candi-chat" -> คำถามผู้ช่วย AI (CANDI) เท่านั้น
    //        ควบคุมด้วย ALLOW_REAL_CANDI_CHAT เหมือนเดิม (true = ปล่อยออกไปเซิร์ฟเวอร์ AI จริง)
    // ==========================================================================
    const originalFetch = window.fetch.bind(window);
    const API_HOST_MATCH = 'script.google.com';
    const CANDI_FUNCTION_MATCH = '/functions/v1/candi-chat';

    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';

        // ---- (ข) คำถาม CANDI AI ที่เรียกไปยัง Supabase Edge Function ----
        if (url.includes(CANDI_FUNCTION_MATCH)) {
            if (!ALLOW_REAL_CANDI_CHAT) {
                return Promise.resolve(new Response(JSON.stringify({
                    status: 'success',
                    reply: makeDemoCandiReply(init)
                }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            }
            // ปล่อยผ่านไปเซิร์ฟเวอร์ AI จริง (ต้องมีเน็ตที่บูธ) พร้อมข้อความสำรองถ้าต่อไม่ติด
            return originalFetch(input, init).catch((err) => {
                console.warn('[Demo Mock API] CANDI real call failed, ใช้ข้อความสำรองแทน', err);
                return new Response(JSON.stringify({
                    status: 'error',
                    message: 'ขณะนี้เชื่อมต่อผู้ช่วย AI (CANDI) ไม่ได้ (อาจไม่มีสัญญาณอินเทอร์เน็ตที่บูธ) กรุณาลองใหม่อีกครั้ง หรือแจ้งเจ้าหน้าที่ประจำบูธค่ะ'
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            });
        }

        // ---- (ก) เรียก API_URL เดิม (Google Apps Script) -> จำลองข้อมูลผู้ป่วยทั้งหมด ----
        const isApiCall = url.includes(API_HOST_MATCH);

        if (!isApiCall) {
            return originalFetch(input, init);
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
