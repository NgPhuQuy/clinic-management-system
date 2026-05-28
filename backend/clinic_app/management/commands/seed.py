"""
seed.py — Tạo dữ liệu mẫu tối thiểu để demo toàn bộ chức năng core.

Chạy:
    python manage.py seed           # idempotent, không xóa dữ liệu cũ
    python manage.py seed --reset   # xóa sạch rồi seed lại

Tài khoản mặc định:
    Admin     admin / Admin@123
    Bác sĩ    dr_an@hospital.vn / 12345678   (tim mạch)
              dr_cuong@hospital.vn / 12345678 (tiêu hóa)
    Nhân viên staff_linh@hospital.vn / 12345678
    Bệnh nhân mai@gmail.com / 12345678
              bao@gmail.com / 12345678
"""
import uuid
from datetime import date, timedelta, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()


# ── Dữ liệu cố định ──────────────────────────────────────────────────────────

SPECIALTIES = [
    {
        "name": "Tim mạch",
        "description": "Chẩn đoán và điều trị các bệnh lý về tim và mạch máu.",
        "services": [
            ("Khám tim mạch tổng quát", 350_000),
            ("Điện tâm đồ (ECG)",        150_000),
            ("Siêu âm tim",              500_000),
        ],
    },
    {
        "name": "Nội tiêu hóa",
        "description": "Chuyên về các bệnh lý dạ dày, ruột, gan mật, tụy.",
        "services": [
            ("Khám nội tiêu hóa",   300_000),
            ("Nội soi dạ dày",      700_000),
            ("Siêu âm ổ bụng",      350_000),
        ],
    },
    {
        "name": "Thần kinh",
        "description": "Điều trị bệnh lý não bộ, tủy sống và hệ thần kinh ngoại biên.",
        "services": [
            ("Khám thần kinh tổng quát", 320_000),
            ("Điện não đồ (EEG)",        500_000),
            ("Chụp MRI não",           1_200_000),
        ],
    },
    {
        "name": "Da liễu",
        "description": "Chẩn đoán và điều trị các bệnh về da, tóc, móng.",
        "services": [
            ("Khám da liễu tổng quát", 250_000),
            ("Điều trị mụn trứng cá",  400_000),
        ],
    },
    {
        "name": "Nhi khoa",
        "description": "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 16 tuổi.",
        "services": [
            ("Khám nhi tổng quát",        280_000),
            ("Tư vấn dinh dưỡng trẻ em",  200_000),
        ],
    },
]

MEDICINE_CATEGORIES = [
    ("Kháng sinh",         "Nhóm kháng sinh phổ rộng và đặc hiệu"),
    ("Giảm đau – Hạ sốt", "Paracetamol, NSAIDs và nhóm giảm đau"),
    ("Tiêu hóa",           "Thuốc dạ dày, nhuận tràng, men tiêu hóa"),
    ("Tim mạch",           "Nhóm thuốc điều trị bệnh tim mạch, tăng huyết áp"),
    ("Vitamin & Khoáng",   "Vitamin tổng hợp, khoáng chất bổ sung"),
]

# (tên, mã, hoạt chất, đơn vị, giá, kê đơn, idx_category)
MEDICINES_DATA = [
    ("Amoxicillin 500mg",  "MED001", "Amoxicillin",          "viên",  4_000,  True,  0),
    ("Azithromycin 250mg", "MED002", "Azithromycin",         "viên", 15_000,  True,  0),
    ("Paracetamol 500mg",  "MED003", "Paracetamol",          "viên",  1_000, False,  1),
    ("Ibuprofen 400mg",    "MED004", "Ibuprofen",            "viên",  2_500, False,  1),
    ("Omeprazole 20mg",    "MED005", "Omeprazole",           "viên",  4_000, False,  2),
    ("Domperidone 10mg",   "MED006", "Domperidone",          "viên",  3_500, False,  2),
    ("Amlodipine 5mg",     "MED007", "Amlodipine besylate",  "viên",  5_000,  True,  3),
    ("Metoprolol 50mg",    "MED008", "Metoprolol succinate", "viên",  7_000,  True,  3),
    ("Vitamin C 500mg",    "MED009", "Ascorbic acid",        "viên",  1_500, False,  4),
    ("Vitamin B complex",  "MED010", "B1+B6+B12",            "viên",  2_000, False,  4),
]

# (họ tên, username, email, idx_specialty, kinh nghiệm, phí, mã BS)
DOCTORS_DATA = [
    ("Nguyễn Văn An",  "dr_an",    "dr_an@hospital.vn",    0, 15, 350_000, "BS-TM-001"),
    ("Trần Thị Bích",  "dr_bich",  "dr_bich@hospital.vn",  0, 10, 300_000, "BS-TM-002"),
    ("Lê Minh Cường",  "dr_cuong", "dr_cuong@hospital.vn", 1, 12, 320_000, "BS-TH-001"),
    ("Phạm Thị Dung",  "dr_dung",  "dr_dung@hospital.vn",  2, 20, 400_000, "BS-TK-001"),
    ("Hoàng Văn Em",   "dr_em",    "dr_em@hospital.vn",    3,  8, 250_000, "BS-DL-001"),
]

# (họ tên, username, email, chức vụ, sđt)
STAFF_DATA = [
    ("Nguyễn Thị Linh", "staff_linh", "staff_linh@hospital.vn", "receptionist", "0911000001"),
    ("Trần Văn Bình",   "staff_binh", "staff_binh@hospital.vn", "pharmacist",   "0911000002"),
]

# (họ tên, username, email, ngày sinh, giới tính, sdt, nhóm máu, bảo hiểm)
PATIENTS_DATA = [
    ("Nguyễn Thị Mai", "patient_mai", "mai@gmail.com", "1990-05-12", "female", "0901234501", "A+", "BN2024001"),
    ("Trần Văn Bảo",   "patient_bao", "bao@gmail.com", "1985-08-20", "male",   "0901234502", "O+", "BN2024002"),
    ("Lê Thị Cúc",     "patient_cuc", "cuc@gmail.com", "1978-03-07", "female", "0901234503", "B+", "BN2024003"),
]


# ── Command ──────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed dữ liệu mẫu tối thiểu để demo các chức năng core"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Xóa toàn bộ dữ liệu cũ trước khi seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("Đang xóa dữ liệu cũ..."))
            self._reset()

        self.stdout.write(self.style.MIGRATE_HEADING("Seed dữ liệu demo..."))

        specialties, services = self._seed_specialties()
        _, medicines          = self._seed_medicines()
        doctors               = self._seed_doctors(specialties)
        staff_list            = self._seed_staff()
        patients              = self._seed_patients()
        schedules             = self._seed_schedules(doctors)
        appointments          = self._seed_appointments(patients, doctors, schedules, services)
        records               = self._seed_medical_records(appointments)
        self._seed_prescriptions(records, medicines, staff_list)
        self._seed_invoices_payments(appointments)
        self._seed_inventory(medicines)
        self._seed_notifications(patients, appointments)
        self._seed_consultations(appointments)

        self.stdout.write(self.style.SUCCESS("\nSeed hoàn tất!\n"))
        self._print_summary()

    # ── Reset ─────────────────────────────────────────────────────────────────

    def _reset(self):
        from clinic_app.models.notification   import Notification
        from clinic_app.models.payment        import Payment, Invoice
        from clinic_app.models.prescription   import PrescriptionDetail, Prescription
        from clinic_app.models.medical_record import TestResult, MedicalRecord
        from clinic_app.models.consultation   import ChatMessage, Consultation
        from clinic_app.models.appointment    import AppointmentService, Appointment
        from clinic_app.models.medicine       import InventoryAlert, Inventory, Medicine, MedicineCategory
        from clinic_app.models.doctor         import DoctorSchedule, Doctor
        from clinic_app.models.patient        import Patient
        from clinic_app.models.staff          import Staff
        from clinic_app.models.specialty      import Service, Specialty

        for model in [
            Notification, Payment, Invoice,
            PrescriptionDetail, Prescription,
            TestResult, MedicalRecord,
            ChatMessage, Consultation,
            AppointmentService, Appointment,
            InventoryAlert, Inventory, Medicine, MedicineCategory,
            DoctorSchedule, Doctor, Patient, Staff,
            Service, Specialty,
        ]:
            model.objects.all().delete()

        User.objects.exclude(is_superuser=True).delete()
        self.stdout.write("  Đã xóa dữ liệu cũ (giữ superuser)")

    # ── Specialties & Services ────────────────────────────────────────────────

    def _seed_specialties(self):
        from clinic_app.models.specialty import Specialty, Service

        specialties, services = [], []
        for sp_data in SPECIALTIES:
            sp, _ = Specialty.objects.get_or_create(
                name=sp_data["name"],
                defaults={"description": sp_data["description"], "is_active": True},
            )
            specialties.append(sp)
            for name, price in sp_data["services"]:
                svc, _ = Service.objects.get_or_create(
                    specialty=sp, name=name,
                    defaults={"price": Decimal(str(price)), "is_active": True},
                )
                services.append(svc)

        self.stdout.write(f"  Chuyên khoa: {len(specialties)} | Dịch vụ: {len(services)}")
        return specialties, services

    # ── Medicines ─────────────────────────────────────────────────────────────

    def _seed_medicines(self):
        from clinic_app.models.medicine import MedicineCategory, Medicine

        cats = []
        for name, desc in MEDICINE_CATEGORIES:
            cat, _ = MedicineCategory.objects.get_or_create(name=name, defaults={"description": desc})
            cats.append(cat)

        medicines = []
        for name, code, generic, unit, price, rx, cat_idx in MEDICINES_DATA:
            med, _ = Medicine.objects.get_or_create(
                code=code,
                defaults={
                    "category": cats[cat_idx],
                    "name": name,
                    "generic_name": generic,
                    "unit": unit,
                    "price": Decimal(str(price)),
                    "requires_prescription": rx,
                    "is_active": True,
                },
            )
            medicines.append(med)

        self.stdout.write(f"  Thuốc: {len(medicines)}")
        return cats, medicines

    # ── Doctors ───────────────────────────────────────────────────────────────

    def _seed_doctors(self, specialties):
        from clinic_app.models.doctor import Doctor

        doctors = []
        for full_name, username, email, sp_idx, exp, fee, license_no in DOCTORS_DATA:
            parts = full_name.split()
            last, first = parts[0], " ".join(parts[1:]) if len(parts) > 1 else parts[0]

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": User.Role.DOCTOR,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password("12345678")
                user.save()

            doctor, _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "specialty": specialties[sp_idx],
                    "license_number": license_no,
                    "experience_years": exp,
                    "consultation_fee": Decimal(str(fee)),
                    "bio": f"Bác sĩ {full_name}, {exp} năm kinh nghiệm tại {specialties[sp_idx].name}.",
                    "is_available": True,
                },
            )
            doctors.append(doctor)

        self.stdout.write(f"  Bác sĩ: {len(doctors)} — password: 12345678")
        return doctors

    # ── Staff ─────────────────────────────────────────────────────────────────

    def _seed_staff(self):
        from clinic_app.models.staff import Staff

        staff_list = []
        for full_name, username, email, position, phone in STAFF_DATA:
            parts = full_name.split()
            last, first = parts[0], " ".join(parts[1:]) if len(parts) > 1 else parts[0]

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": User.Role.STAFF,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password("12345678")
                user.save()

            staff, _ = Staff.objects.get_or_create(
                user=user,
                defaults={"position": position, "phone": phone},
            )
            staff_list.append(staff)

        self.stdout.write(f"  Nhân viên: {len(staff_list)} — password: 12345678")
        return staff_list

    # ── Patients ──────────────────────────────────────────────────────────────

    def _seed_patients(self):
        from clinic_app.models.patient import Patient

        patients = []
        for full_name, username, email, dob, gender, phone, blood, insurance in PATIENTS_DATA:
            parts = full_name.split()
            last, first = parts[0], " ".join(parts[1:]) if len(parts) > 1 else parts[0]

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": User.Role.PATIENT,
                },
            )
            if created:
                user.set_password("12345678")
                user.save()

            patient, _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "date_of_birth": date.fromisoformat(dob),
                    "gender": gender,
                    "phone": phone,
                    "blood_type": blood,
                    "insurance_number": insurance,
                },
            )
            patients.append(patient)

        self.stdout.write(f"  Bệnh nhân: {len(patients)} — password: 12345678")
        return patients

    # ── Doctor Schedules ──────────────────────────────────────────────────────

    def _seed_schedules(self, doctors):
        from clinic_app.models.doctor import DoctorSchedule

        schedules = []
        today = date.today()
        slots = [
            (time(7, 30), time(11, 30)),
            (time(13, 0), time(17, 0)),
        ]

        for doctor in doctors:
            for delta in range(-3, 8):   # 3 ngày qua → 7 ngày tới
                sched_date = today + timedelta(days=delta)
                if sched_date.weekday() == 6:  # bỏ Chủ nhật
                    continue
                start_t, end_t = slots[delta % 2]
                sched, _ = DoctorSchedule.objects.get_or_create(
                    doctor=doctor,
                    date=sched_date,
                    start_time=start_t,
                    defaults={
                        "end_time": end_t,
                        "max_appointments": 10,
                        "is_available": delta >= 0,
                    },
                )
                schedules.append(sched)

        self.stdout.write(f"  Lịch làm việc: {len(schedules)}")
        return schedules

    # ── Appointments ──────────────────────────────────────────────────────────

    def _seed_appointments(self, patients, doctors, schedules, services):
        from clinic_app.models.appointment import Appointment, AppointmentService

        today = date.today()
        appointments = []

        # Danh sách cố định để demo đủ các trạng thái
        scenarios = [
            # (patient_idx, doctor_idx, delta_days, hour, status)
            (0, 0, -2, 9,  Appointment.Status.COMPLETED),   # đã khám xong → có hồ sơ, đơn thuốc, thanh toán
            (1, 0, -1, 10, Appointment.Status.COMPLETED),
            (2, 2, -1, 14, Appointment.Status.COMPLETED),
            (0, 1,  0,  9, Appointment.Status.CONFIRMED),   # hôm nay đã xác nhận → staff thấy
            (1, 2,  0, 14, Appointment.Status.IN_PROGRESS), # đang khám → dashboard bác sĩ
            (2, 0,  1,  9, Appointment.Status.PENDING),     # ngày mai chờ xác nhận → staff confirm
            (0, 1,  2, 10, Appointment.Status.PENDING),
            (1, 3,  3, 14, Appointment.Status.CANCELLED),   # đã hủy
        ]

        reasons = [
            "Đau ngực, khó thở khi gắng sức",
            "Đau bụng vùng thượng vị kéo dài",
            "Kiểm tra sức khỏe định kỳ",
            "Tăng huyết áp không kiểm soát",
            "Đau đầu chóng mặt",
            "Ợ hơi, trào ngược dạ dày",
            "Mệt mỏi, tim đập nhanh",
            "Nổi mẩn đỏ, ngứa",
        ]

        for i, (p_idx, d_idx, delta, hour, status) in enumerate(scenarios):
            patient = patients[p_idx % len(patients)]
            doctor  = doctors[d_idx % len(doctors)]
            appt_dt = timezone.make_aware(
                timezone.datetime(*(today + timedelta(days=delta)).timetuple()[:3], hour, 0)
            )
            sched = next(
                (s for s in schedules if s.doctor == doctor and s.date == appt_dt.date()),
                None,
            )
            appt = Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                schedule=sched,
                appointment_date=appt_dt,
                status=status,
                reason=reasons[i % len(reasons)],
            )
            appointments.append(appt)

            if status != Appointment.Status.CANCELLED:
                dr_svcs = [s for s in services if s.specialty == doctor.specialty]
                for svc in dr_svcs[:2]:
                    AppointmentService.objects.create(
                        appointment=appt, service=svc,
                        quantity=1, price_at_time=svc.price,
                    )

        self.stdout.write(f"  Lịch hẹn: {len(appointments)}")
        return appointments

    # ── Medical Records ───────────────────────────────────────────────────────

    def _seed_medical_records(self, appointments):
        from clinic_app.models.medical_record import MedicalRecord, TestResult
        from clinic_app.models.appointment    import Appointment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        records = []

        data = [
            ("Tăng huyết áp độ II",            "Đau đầu vùng gáy, hoa mắt, đo HA 160/100",    "Điều chỉnh liều, theo dõi HA tại nhà"),
            ("Viêm loét dạ dày – tá tràng",    "Đau thượng vị sau ăn, ợ hơi nhiều, buồn nôn", "Kháng sinh diệt H. pylori 14 ngày + PPI"),
            ("Trào ngược dạ dày – thực quản",   "Ợ nóng sau xương ức, khó nuốt",               "Esomeprazole 40mg trước ăn, nằm đầu cao"),
        ]
        test_types = [
            ("blood",      "Đường huyết lúc đói",    "5.8 mmol/L",     "mmol/L", "3.9–6.1"),
            ("urine",      "Tổng phân tích nước tiểu","Không bất thường","",      "Âm tính"),
            ("ecg",        "Điện tâm đồ 12 chuyển đạo","Nhịp xoang 72 lần/phút","bpm","60–100"),
        ]

        for idx, appt in enumerate(completed):
            diag, symp, notes = data[idx % len(data)]
            record = MedicalRecord.objects.create(
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                diagnosis=diag,
                symptoms=symp,
                treatment_notes=notes,
                follow_up_date=(appt.appointment_date + timedelta(days=30)).date(),
            )
            records.append(record)

            t_type, t_name, t_result, t_unit, t_ref = test_types[idx % len(test_types)]
            TestResult.objects.create(
                medical_record=record,
                test_type=t_type,
                test_name=t_name,
                result=t_result,
                unit=t_unit,
                reference_range=t_ref,
                test_date=appt.appointment_date.date(),
            )

        self.stdout.write(f"  Hồ sơ bệnh án: {len(records)}")
        return records

    # ── Prescriptions ─────────────────────────────────────────────────────────

    def _seed_prescriptions(self, records, medicines, staff_list):
        from clinic_app.models.prescription import Prescription, PrescriptionDetail

        pharmacist = next((s for s in staff_list if s.position == "pharmacist"), staff_list[0] if staff_list else None)
        prescriptions = []

        for idx, record in enumerate(records):
            # record[0] → dispensed (đã cấp), record[1] → pending (chờ cấp)
            is_dispensed = (idx % 2 == 0)
            presc = Prescription.objects.create(
                medical_record=record,
                status=Prescription.Status.DISPENSED if is_dispensed else Prescription.Status.PENDING,
                notes="Uống đúng liều, đủ ngày.",
                dispensed_at=timezone.now() - timedelta(hours=2) if is_dispensed else None,
                dispensed_by=pharmacist if is_dispensed else None,
            )
            prescriptions.append(presc)

            chosen = medicines[:3]
            for med in chosen:
                PrescriptionDetail.objects.create(
                    prescription=presc,
                    medicine=med,
                    quantity=14,
                    dosage="1 viên",
                    frequency="2 lần/ngày (sáng – tối)",
                    duration_days=7,
                    instructions="Uống sau ăn 30 phút với nhiều nước.",
                    price_at_time=med.price,
                )

        self.stdout.write(f"  Đơn thuốc: {len(prescriptions)}")
        return prescriptions

    # ── Invoices & Payments ───────────────────────────────────────────────────

    def _seed_invoices_payments(self, appointments):
        from clinic_app.models.appointment import Appointment
        from clinic_app.models.payment     import Invoice, Payment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        confirmed = [a for a in appointments if a.status == Appointment.Status.CONFIRMED]

        for appt in completed:
            inv, created = Invoice.objects.get_or_create(appointment=appt)
            if not created:
                continue
            if not Payment.objects.filter(invoice=inv).exists():
                Payment.objects.create(
                    invoice=inv,
                    amount=inv.total_amount,
                    payment_method=Payment.Method.MOMO,
                    status=Payment.Status.SUCCESS,
                    transaction_id=f"MOMO{uuid.uuid4().hex[:10].upper()}",
                    note="Thanh toán qua MoMo",
                    paid_at=timezone.now() - timedelta(hours=1),
                )

        for appt in confirmed[:1]:
            inv, created = Invoice.objects.get_or_create(appointment=appt)
            if created or not Payment.objects.filter(invoice=inv).exists():
                Payment.objects.create(
                    invoice=inv,
                    amount=inv.total_amount,
                    payment_method=Payment.Method.VNPAY,
                    status=Payment.Status.PENDING,
                    transaction_id=f"VNP{uuid.uuid4().hex[:10].upper()}",
                    note="Chờ thanh toán VNPay",
                )

        self.stdout.write("  Hóa đơn & thanh toán: OK")

    # ── Inventory ─────────────────────────────────────────────────────────────

    def _seed_inventory(self, medicines):
        from clinic_app.models.medicine import Inventory, InventoryAlert

        today = date.today()
        suppliers = ["Dược Hậu Giang", "Pymepharco", "OPC Pharma"]

        inventory_data = [
            # (medicine_idx, qty, expiry_delta_days, supplier_idx)
            (0, 200, 365,  0),   # Amoxicillin — đủ hàng
            (1, 150, 300,  1),   # Azithromycin — đủ hàng
            (2, 500, 400,  2),   # Paracetamol — đủ hàng
            (3, 300, 350,  0),   # Ibuprofen — đủ hàng
            (4, 180, 280,  1),   # Omeprazole — đủ hàng
            (5, 120, 320,  2),   # Domperidone — đủ hàng
            (6, 7,   180,  0),   # Amlodipine — SẮP HẾT HÀNG (ngưỡng 10)
            (7, 90,  25,   1),   # Metoprolol — SẮP HẾT HẠN (25 ngày)
            (8, 250, 365,  2),   # Vitamin C — đủ hàng
            (9, 200, 400,  0),   # Vitamin B — đủ hàng
        ]

        for med_idx, qty, expiry_delta, sup_idx in inventory_data:
            med = medicines[med_idx]
            batch = f"LOT{med.code}-01"
            if Inventory.objects.filter(medicine=med, batch_number=batch).exists():
                continue

            inv = Inventory.objects.create(
                medicine=med,
                batch_number=batch,
                quantity=qty,
                expiry_date=today + timedelta(days=expiry_delta),
                import_date=today - timedelta(days=30),
                import_price=med.price * Decimal("0.6"),
                supplier=suppliers[sup_idx],
                warning_threshold=50,
            )

            if qty <= 10:
                InventoryAlert.objects.get_or_create(
                    medicine=med, inventory=inv,
                    alert_type=InventoryAlert.AlertType.LOW_STOCK,
                    defaults={"message": f"{med.name} lô {batch} còn {qty} đơn vị – dưới ngưỡng cảnh báo."},
                )
            if expiry_delta <= 30:
                InventoryAlert.objects.get_or_create(
                    medicine=med, inventory=inv,
                    alert_type=InventoryAlert.AlertType.NEAR_EXPIRY,
                    defaults={"message": f"{med.name} lô {batch} sẽ hết hạn trong {expiry_delta} ngày."},
                )

        self.stdout.write("  Kho thuốc: OK (có 1 sắp hết hàng, 1 sắp hết hạn để demo cảnh báo)")

    # ── Notifications ─────────────────────────────────────────────────────────

    def _seed_notifications(self, patients, appointments):
        from clinic_app.models.notification import Notification
        from clinic_app.models.appointment  import Appointment

        notifs = []
        upcoming = [a for a in appointments if a.status in (
            Appointment.Status.CONFIRMED, Appointment.Status.PENDING
        )]
        for appt in upcoming:
            notifs.append(Notification(
                user=appt.patient.user,
                title="Nhắc lịch khám",
                message=(
                    f"Bạn có lịch hẹn với BS. {appt.doctor.user.get_full_name()} "
                    f"vào {appt.appointment_date.strftime('%H:%M ngày %d/%m/%Y')}."
                ),
                type=Notification.Type.APPOINTMENT_REMINDER,
                related_object_id=appt.id,
                related_object_type=Notification.ObjectType.APPOINTMENT,
                is_read=False,
            ))

        notifs.append(Notification(
            user=patients[0].user,
            title="Thanh toán thành công",
            message="Hóa đơn khám bệnh đã được thanh toán qua MoMo.",
            type=Notification.Type.PAYMENT_SUCCESS,
            is_read=False,
        ))
        notifs.append(Notification(
            user=patients[0].user,
            title="Đơn thuốc đã sẵn sàng",
            message="Đơn thuốc của bạn đã được cấp phát. Vui lòng đến nhận tại quầy dược.",
            type=Notification.Type.PRESCRIPTION_READY,
            is_read=False,
        ))

        Notification.objects.bulk_create(notifs)
        self.stdout.write(f"  Thông báo: {len(notifs)}")

    # ── Consultations ─────────────────────────────────────────────────────────

    def _seed_consultations(self, appointments):
        from clinic_app.models.consultation import Consultation, ChatMessage
        from clinic_app.models.appointment  import Appointment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        for appt in completed[:2]:
            if Consultation.objects.filter(appointment=appt).exists():
                continue
            started = appt.appointment_date
            ended   = started + timedelta(minutes=30)
            c = Consultation.objects.create(
                appointment=appt,
                type=Consultation.Type.CHAT,
                room_id=f"ROOM-{uuid.uuid4().hex[:8].upper()}",
                status=Consultation.Status.ENDED,
                started_at=started,
                ended_at=ended,
            )
            msgs = [
                (False, "Chào bác sĩ, em đang bị đau đầu và chóng mặt ạ."),
                (True,  "Chào bạn! Triệu chứng bắt đầu từ bao giờ?"),
                (False, "Dạ từ khoảng 2 ngày trước ạ, ngày càng nặng hơn."),
                (True,  "Bạn có đo huyết áp chưa? Tôi sẽ kê đơn cho bạn sau khi khám."),
                (False, "Dạ chưa ạ, em sẽ đo ngay."),
                (True,  "OK. Nhớ uống đúng liều, đủ ngày nhé. Chúc bạn mau khỏe!"),
            ]
            for is_doctor, msg in msgs:
                sender = appt.doctor.user if is_doctor else appt.patient.user
                ChatMessage.objects.create(consultation=c, sender=sender, message=msg, is_read=True)

        self.stdout.write("  Tư vấn online + chat: OK")

    # ── Summary ───────────────────────────────────────────────────────────────

    def _print_summary(self):
        self.stdout.write(self.style.SUCCESS("\nTài khoản demo:"))
        self.stdout.write("  Bác sĩ    dr_an@hospital.vn    / 12345678  (Tim mạch)")
        self.stdout.write("  Bác sĩ    dr_cuong@hospital.vn / 12345678  (Tiêu hóa)")
        self.stdout.write("  Nhân viên staff_linh@hospital.vn / 12345678")
        self.stdout.write("  Bệnh nhân mai@gmail.com        / 12345678")
        self.stdout.write("  Bệnh nhân bao@gmail.com        / 12345678")
        self.stdout.write("\n  Superuser và OAuth2 Application: tự tạo thủ công\n")
