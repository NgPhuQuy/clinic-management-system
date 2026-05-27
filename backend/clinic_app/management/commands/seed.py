import random
import uuid
from datetime import date, timedelta, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()


# ──────────────────────────────────────────────────────────────
#  DỮ LIỆU MẪU
# ──────────────────────────────────────────────────────────────

SPECIALTIES = [
    {
        "name": "Tim mạch",
        "description": "Chẩn đoán và điều trị các bệnh lý về tim và mạch máu.",
        "services": [
            ("Khám tim mạch tổng quát",       350_000),
            ("Điện tâm đồ (ECG)",              150_000),
            ("Siêu âm tim",                    500_000),
            ("Holter ECG 24 giờ",              800_000),
            ("Đo huyết áp lưu động 24h",       600_000),
        ],
    },
    {
        "name": "Nội tiêu hóa",
        "description": "Chuyên về các bệnh lý dạ dày, ruột, gan mật, tụy.",
        "services": [
            ("Khám nội tiêu hóa",              300_000),
            ("Nội soi dạ dày",                 700_000),
            ("Nội soi đại tràng",              900_000),
            ("Siêu âm ổ bụng",                350_000),
            ("Xét nghiệm H. pylori",           250_000),
        ],
    },
    {
        "name": "Thần kinh",
        "description": "Điều trị bệnh lý về não bộ, tủy sống và hệ thần kinh ngoại biên.",
        "services": [
            ("Khám thần kinh tổng quát",       320_000),
            ("Điện não đồ (EEG)",              500_000),
            ("Chụp MRI não",                 1_200_000),
            ("Đo dẫn truyền thần kinh",        450_000),
        ],
    },
    {
        "name": "Da liễu",
        "description": "Chẩn đoán và điều trị các bệnh về da, tóc, móng.",
        "services": [
            ("Khám da liễu tổng quát",         250_000),
            ("Điều trị mụn trứng cá",          400_000),
            ("Laser trị nám",                  600_000),
            ("Sinh thiết da",                  350_000),
        ],
    },
    {
        "name": "Nhi khoa",
        "description": "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 16 tuổi.",
        "services": [
            ("Khám nhi tổng quát",             280_000),
            ("Tư vấn dinh dưỡng trẻ em",      200_000),
            ("Khám tăng trưởng & phát triển", 300_000),
            ("Tiêm chủng",                     150_000),
        ],
    },
    {
        "name": "Sản phụ khoa",
        "description": "Chăm sóc sức khỏe sinh sản và thai sản.",
        "services": [
            ("Khám phụ khoa tổng quát",        300_000),
            ("Siêu âm thai",                   350_000),
            ("Xét nghiệm Pap smear",           250_000),
            ("Tư vấn kế hoạch hóa gia đình",  200_000),
            ("Khám thai định kỳ",              300_000),
        ],
    },
    {
        "name": "Chấn thương chỉnh hình",
        "description": "Điều trị gãy xương, khớp, cột sống và cơ xương khớp.",
        "services": [
            ("Khám cơ xương khớp",             320_000),
            ("Chụp X-quang xương",             200_000),
            ("Vật lý trị liệu",                300_000),
            ("Tiêm khớp",                      500_000),
        ],
    },
    {
        "name": "Mắt",
        "description": "Chẩn đoán và điều trị các bệnh về mắt.",
        "services": [
            ("Khám mắt tổng quát",             250_000),
            ("Đo khúc xạ / kính mắt",         150_000),
            ("Đo nhãn áp",                     100_000),
            ("Chụp đáy mắt",                   400_000),
        ],
    },
]

MEDICINE_CATEGORIES = [
    ("Thuốc tim mạch",   "Nhóm thuốc điều trị bệnh tim mạch, tăng huyết áp"),
    ("Kháng sinh",        "Nhóm kháng sinh phổ rộng và đặc hiệu"),
    ("Giảm đau – Hạ sốt","Paracetamol, NSAIDs và nhóm giảm đau"),
    ("Tiêu hóa",          "Thuốc dạ dày, nhuận tràng, men tiêu hóa"),
    ("Vitamin & Khoáng",  "Vitamin tổng hợp, khoáng chất bổ sung"),
]

MEDICINES_DATA = [
    ("Amlodipine 5mg",        "MED001", "Amlodipine besylate",   "viên",  5_000,  True,  0),
    ("Losartan 50mg",         "MED002", "Losartan potassium",    "viên",  8_000,  True,  0),
    ("Atorvastatin 10mg",     "MED003", "Atorvastatin calcium",  "viên",  12_000, True,  0),
    ("Metoprolol 50mg",       "MED004", "Metoprolol succinate",  "viên",  7_000,  True,  0),
    ("Furosemide 40mg",       "MED005", "Furosemide",            "viên",  3_000,  True,  0),
    ("Amoxicillin 500mg",     "MED006", "Amoxicillin",           "viên",  4_000,  True,  1),
    ("Azithromycin 250mg",    "MED007", "Azithromycin",          "viên",  15_000, True,  1),
    ("Ciprofloxacin 500mg",   "MED008", "Ciprofloxacin",         "viên",  6_000,  True,  1),
    ("Cefuroxime 500mg",      "MED009", "Cefuroxime axetil",     "viên",  18_000, True,  1),
    ("Doxycycline 100mg",     "MED010", "Doxycycline hyclate",   "viên",  5_000,  True,  1),
    ("Paracetamol 500mg",     "MED011", "Paracetamol",           "viên",  1_000,  False, 2),
    ("Ibuprofen 400mg",       "MED012", "Ibuprofen",             "viên",  2_500,  False, 2),
    ("Diclofenac 50mg",       "MED013", "Diclofenac sodium",     "viên",  3_000,  True,  2),
    ("Tramadol 50mg",         "MED014", "Tramadol HCl",          "viên",  8_000,  True,  2),
    ("Meloxicam 15mg",        "MED015", "Meloxicam",             "viên",  5_000,  True,  2),
    ("Omeprazole 20mg",       "MED016", "Omeprazole",            "viên",  4_000,  False, 3),
    ("Pantoprazole 40mg",     "MED017", "Pantoprazole sodium",   "viên",  6_000,  True,  3),
    ("Domperidone 10mg",      "MED018", "Domperidone",           "viên",  3_500,  False, 3),
    ("Lactulose 10g/15ml",    "MED019", "Lactulose",             "gói",   8_000,  False, 3),
    ("Men tiêu hóa Bifina",   "MED020", "Lactobacillus spp.",    "gói",   10_000, False, 3),
    ("Vitamin C 500mg",       "MED021", "Ascorbic acid",         "viên",  1_500,  False, 4),
    ("Vitamin D3 1000IU",     "MED022", "Cholecalciferol",       "viên",  3_000,  False, 4),
    ("Canxi + D3 Hapacol",    "MED023", "Calcium carbonate",     "viên",  5_000,  False, 4),
    ("Sắt (II) Sulfate",      "MED024", "Ferrous sulfate",       "viên",  4_000,  False, 4),
    ("Vitamin B complex",     "MED025", "B1+B6+B12",             "viên",  2_000,  False, 4),
    ("Metformin 500mg",       "MED026", "Metformin HCl",         "viên",  3_000,  True,  0),
    ("Prednisolone 5mg",      "MED027", "Prednisolone",          "viên",  4_000,  True,  2),
    ("Salbutamol 4mg",        "MED028", "Salbutamol sulfate",    "viên",  3_500,  True,  0),
    ("Cetirizine 10mg",       "MED029", "Cetirizine HCl",        "viên",  5_000,  False, 2),
    ("Esomeprazole 40mg",     "MED030", "Esomeprazole magnesium","viên",  9_000,  True,  3),
]

DOCTORS_DATA = [
    ("Nguyễn Văn An",     "dr_an",      "dr.an@hospital.vn",      0, 15, 350_000, "BS-TM-001"),
    ("Trần Thị Bích",     "dr_bich",    "dr.bich@hospital.vn",    0, 10, 300_000, "BS-TM-002"),
    ("Lê Minh Cường",     "dr_cuong",   "dr.cuong@hospital.vn",   1, 12, 320_000, "BS-TH-001"),
    ("Phạm Thị Dung",     "dr_dung",    "dr.dung@hospital.vn",    2, 20, 400_000, "BS-TK-001"),
    ("Hoàng Văn Em",      "dr_em",      "dr.em@hospital.vn",      3,  8, 250_000, "BS-DL-001"),
    ("Vũ Thị Phương",     "dr_phuong",  "dr.phuong@hospital.vn",  4, 18, 280_000, "BS-NK-001"),
    ("Đặng Minh Quân",    "dr_quan",    "dr.quan@hospital.vn",    5, 14, 320_000, "BS-SP-001"),
    ("Bùi Thị Hoa",       "dr_hoa",     "dr.hoa@hospital.vn",     6, 11, 350_000, "BS-XK-001"),
    ("Ngô Thanh Hải",     "dr_hai",     "dr.hai@hospital.vn",     7, 16, 280_000, "BS-MT-001"),
    ("Đinh Thị Lan",      "dr_lan",     "dr.lan@hospital.vn",     1,  9, 300_000, "BS-TH-002"),
]

PATIENTS_DATA = [
    ("Nguyễn Thị Mai",     "patient_mai",   "mai.nguyen@gmail.com",    "1990-05-12", "female", "0901234501", "A+", "BN2024001"),
    ("Trần Văn Bảo",       "patient_bao",   "bao.tran@gmail.com",      "1985-08-20", "male",   "0901234502", "O+", "BN2024002"),
    ("Lê Thị Cúc",         "patient_cuc",   "cuc.le@gmail.com",        "1978-03-07", "female", "0901234503", "B+", "BN2024003"),
    ("Phạm Minh Đức",      "patient_duc",   "duc.pham@gmail.com",      "1992-11-30", "male",   "0901234504", "AB+","BN2024004"),
    ("Hoàng Thị Em",       "patient_em",    "em.hoang@gmail.com",      "2000-01-15", "female", "0901234505", "O-", "BN2024005"),
    ("Vũ Văn Phúc",        "patient_phuc",  "phuc.vu@gmail.com",       "1975-06-22", "male",   "0901234506", "A-", "BN2024006"),
    ("Đặng Thị Giang",     "patient_giang", "giang.dang@gmail.com",    "1988-09-14", "female", "0901234507", "B-", "BN2024007"),
    ("Bùi Văn Hùng",       "patient_hung",  "hung.bui@gmail.com",      "1982-12-01", "male",   "0901234508", "O+", "BN2024008"),
    ("Ngô Thị Hương",      "patient_huong", "huong.ngo@gmail.com",     "1995-07-18", "female", "0901234509", "A+", "BN2024009"),
    ("Đinh Văn Khoa",      "patient_khoa",  "khoa.dinh@gmail.com",     "1970-04-25", "male",   "0901234510", "AB-","BN2024010"),
    ("Lý Thị Liên",        "patient_lien",  "lien.ly@gmail.com",       "1998-02-09", "female", "0901234511", "O+", "BN2024011"),
    ("Trịnh Văn Minh",     "patient_minh",  "minh.trinh@gmail.com",    "1983-10-17", "male",   "0901234512", "B+", "BN2024012"),
    ("Phan Thị Nga",       "patient_nga",   "nga.phan@gmail.com",      "1991-08-03", "female", "0901234513", "A+", "BN2024013"),
    ("Cao Văn Oanh",       "patient_oanh",  "oanh.cao@gmail.com",      "1967-05-28", "male",   "0901234514", "O+", "BN2024014"),
    ("Dương Thị Phượng",   "patient_phuong","phuong.duong@gmail.com",  "2003-03-11", "female", "0901234515", "AB+","BN2024015"),
    ("Đỗ Văn Quang",       "patient_quang", "quang.do@gmail.com",      "1980-01-06", "male",   "0901234516", "A-", "BN2024016"),
    ("Hồ Thị Rừng",        "patient_rung",  "rung.ho@gmail.com",       "1993-11-21", "female", "0901234517", "O+", "BN2024017"),
    ("Tô Văn Sơn",         "patient_son",   "son.to@gmail.com",        "1976-07-30", "male",   "0901234518", "B+", "BN2024018"),
    ("Lâm Thị Thủy",       "patient_thuy",  "thuy.lam@gmail.com",      "1987-04-16", "female", "0901234519", "O-", "BN2024019"),
    ("Mai Văn Uy",         "patient_uy",    "uy.mai@gmail.com",        "1972-09-08", "male",   "0901234520", "A+", "BN2024020"),
]

STAFF_DATA = [
    # (họ_tên, username, email, chức_vụ, sđt, specialty_idx)
    ("Nguyễn Thị Hà",    "staff_ha",    "ha.staff@hospital.vn",   "nurse",       "0911000001", 0),
    ("Trần Văn Bình",    "staff_binh",  "binh.staff@hospital.vn", "nurse",       "0911000002", 1),
    ("Lê Thị Châu",      "staff_chau",  "chau.staff@hospital.vn", "pharmacist",  "0911000003", None),
    ("Phạm Minh Đạt",    "staff_dat",   "dat.staff@hospital.vn",  "lab_tech",    "0911000004", None),
    ("Hoàng Thị Linh",   "staff_linh",  "linh.staff@hospital.vn", "receptionist","0911000005", None),
    ("Vũ Văn Mạnh",      "staff_manh",  "manh.staff@hospital.vn", "xray_tech",   "0911000006", 6),
]

APPOINTMENT_REASONS = [
    "Đau ngực, khó thở khi gắng sức",
    "Đau bụng vùng thượng vị kéo dài",
    "Đau đầu dữ dội, chóng mặt",
    "Nổi mẩn đỏ toàn thân, ngứa nhiều",
    "Trẻ sốt cao liên tục 3 ngày",
    "Ra huyết bất thường, đau bụng dưới",
    "Đau khớp gối phải khi đi lại",
    "Mắt mờ, nhìn không rõ gần đây",
    "Tăng huyết áp không kiểm soát được",
    "Kiểm tra sức khỏe định kỳ",
    "Đau lưng dưới lan xuống chân",
    "Ợ hơi, ợ chua, trào ngược dạ dày",
    "Tim đập nhanh, hồi hộp, mệt mỏi",
    "Tê bì chân tay, yếu cơ",
    "Da khô, bong tróc, ngứa mùa đông",
]

DIAGNOSES = [
    "Tăng huyết áp độ II – cần điều chỉnh phác đồ",
    "Viêm loét dạ dày – tá tràng do H. pylori",
    "Đau nửa đầu Migraine mạn tính",
    "Viêm da cơ địa mãn tính",
    "Viêm phế quản cấp tính",
    "U xơ tử cung kích thước nhỏ, theo dõi",
    "Thoái hóa khớp gối hai bên độ II",
    "Cận thị nặng, loạn thị nhẹ",
    "Đái tháo đường type 2 mới phát hiện",
    "Trào ngược dạ dày – thực quản (GERD)",
    "Thiếu máu thiếu sắt mức độ nhẹ",
    "Viêm amidan mạn tính",
    "Hội chứng ruột kích thích (IBS)",
    "Suy giảm chức năng tuyến giáp (Hypothyroidism)",
    "Rối loạn lipid máu – tăng cholesterol",
]

SYMPTOMS = [
    "Đau tức ngực, khó thở khi leo cầu thang, phù chân nhẹ",
    "Đau thượng vị sau ăn, ợ hơi nhiều, buồn nôn",
    "Đau đầu một bên theo nhịp tim, sợ ánh sáng và tiếng ồn",
    "Ngứa dữ dội về đêm, da đỏ, khô, bong tróc",
    "Sốt 39°C, ho có đờm vàng, đau ngực khi hít thở sâu",
    "Chu kỳ kinh nguyệt bất thường, kinh ra nhiều",
    "Đau nhức khớp gối, sưng nhẹ, khó gập duỗi",
    "Nhìn mờ, đau nhức mắt vào buổi chiều",
    "Đau đầu vùng gáy, hoa mắt, đo HA 160/100",
    "Ợ nóng sau xương ức, nóng rát họng, khó nuốt",
]

TREATMENT_NOTES = [
    "Điều chỉnh liều Amlodipine, theo dõi HA tại nhà mỗi sáng, hạn chế muối",
    "Kháng sinh diệt H. pylori 14 ngày + PPI 4 tuần, tái khám kiểm tra",
    "Dùng Sumatriptan khi cơn đau, phòng ngừa bằng Topiramate 25mg/ngày",
    "Bôi kem Hydrocortisone 1%, tắm nước ấm, tránh xà phòng có hương liệu",
    "Kháng sinh Amoxicillin 7 ngày, nghỉ ngơi, uống nước đủ 2L/ngày",
    "Theo dõi 3 tháng, siêu âm tái đánh giá, nếu u phát triển xem xét phẫu thuật",
    "Vật lý trị liệu 10 buổi, tiêm khớp gối, giảm cân nếu thừa cân",
    "Đổi kính mới theo toa, tái khám 1 năm hoặc khi thị lực giảm",
    "Metformin 500mg x 2 lần/ngày, điều chỉnh chế độ ăn, tập thể dục đều",
    "Esomeprazole 40mg trước ăn sáng, nằm đầu cao 15cm, tránh cà phê và bia rượu",
]

CHAT_MESSAGES_TEMPLATE = [
    # (is_doctor, nội_dung)
    (False, "Chào bác sĩ, em đang bị {symptom}, bác sĩ cho em hỏi là có nguy hiểm không ạ?"),
    (True,  "Chào bạn! Tình trạng bạn mô tả cần được thăm khám trực tiếp. Bạn có thể cho biết triệu chứng bắt đầu từ bao giờ không?"),
    (False, "Dạ từ khoảng 3 ngày trước ạ, ngày càng nặng hơn ạ."),
    (True,  "Bạn có dùng thuốc gì chưa? Và có dị ứng thuốc không?"),
    (False, "Dạ em chưa dùng thuốc ạ, em không biết mình dị ứng thuốc gì không."),
    (True,  "OK. Tôi sẽ kê đơn cho bạn. Nhớ uống đúng liều, đủ ngày nhé. Sau 3 ngày nếu không cải thiện thì liên hệ lại."),
    (False, "Dạ cảm ơn bác sĩ nhiều ạ!"),
    (True,  "Bạn nhớ nghỉ ngơi đầy đủ và uống nhiều nước nhé. Chúc bạn mau khỏe!"),
]

TRANSACTION_IDS = [
    "MOMO", "VNP", "CC", "CASH", "BANK"
]


# ──────────────────────────────────────────────────────────────
#  COMMAND
# ──────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Tạo dữ liệu mẫu đầy đủ cho hệ thống bệnh viện"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Xóa toàn bộ dữ liệu cũ trước khi seed",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("⚠️  Đang xóa dữ liệu cũ..."))
            self._reset_data()

        self.stdout.write(self.style.MIGRATE_HEADING("🏥 Bắt đầu seed dữ liệu bệnh viện..."))

        # Thứ tự import cần theo dependency
        specialties, services     = self._seed_specialties()
        medicine_cats, medicines  = self._seed_medicines()
        doctors                   = self._seed_doctors(specialties)
        patients                  = self._seed_patients()
        staff_list                = self._seed_staff(specialties)
        schedules                 = self._seed_schedules(doctors)
        appointments              = self._seed_appointments(patients, doctors, schedules, services)
        consultations             = self._seed_consultations(appointments, doctors, patients)
        records                   = self._seed_medical_records(appointments, doctors, patients, staff_list)
        prescriptions             = self._seed_prescriptions(records, medicines, staff_list)
        self._seed_invoices_payments(appointments)
        self._seed_inventory(medicines)
        self._seed_notifications(patients, doctors, appointments, prescriptions)

        self.stdout.write(self.style.SUCCESS("\n✅  Seed dữ liệu hoàn tất!\n"))
        self._print_summary()

    # ── RESET ────────────────────────────────────────────────
    def _reset_data(self):
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

        models_to_clear = [
            Notification, Payment, Invoice,
            PrescriptionDetail, Prescription,
            TestResult, MedicalRecord,
            ChatMessage, Consultation,
            AppointmentService, Appointment,
            InventoryAlert, Inventory, Medicine, MedicineCategory,
            DoctorSchedule, Doctor, Patient, Staff,
            Service, Specialty,
        ]
        for model in models_to_clear:
            count, _ = model.objects.all().delete()
            self.stdout.write(f"  Đã xóa {count:>4} bản ghi {model.__name__}")

        User.objects.exclude(is_superuser=True).delete()
        self.stdout.write("  Đã xóa người dùng (giữ superuser)")

    # ── SPECIALTIES & SERVICES ───────────────────────────────
    def _seed_specialties(self):
        from clinic_app.models.specialty import Specialty, Service

        specialties, services = [], []
        for sp_data in SPECIALTIES:
            sp, _ = Specialty.objects.get_or_create(
                name=sp_data["name"],
                defaults={"description": sp_data["description"], "is_active": True},
            )
            specialties.append(sp)
            for svc_name, svc_price in sp_data["services"]:
                svc, _ = Service.objects.get_or_create(
                    specialty=sp,
                    name=svc_name,
                    defaults={"price": Decimal(str(svc_price)), "is_active": True},
                )
                services.append(svc)

        self.stdout.write(f"  ✔ Chuyên khoa: {len(specialties)} | Dịch vụ: {len(services)}")
        return specialties, services

    # ── MEDICINES ────────────────────────────────────────────
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

        self.stdout.write(f"  ✔ Danh mục thuốc: {len(cats)} | Thuốc: {len(medicines)}")
        return cats, medicines

    # ── DOCTORS ──────────────────────────────────────────────
    def _seed_doctors(self, specialties):
        from clinic_app.models.doctor import Doctor

        doctors = []
        for full_name, username, email, sp_idx, exp, fee, license_no in DOCTORS_DATA:
            last, *first_parts = full_name.split()
            first = " ".join(first_parts) if first_parts else last

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
                user.set_password("Doctor@123")
                user.save()

            doctor, _ = Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "specialty": specialties[sp_idx],
                    "license_number": license_no,
                    "experience_years": exp,
                    "consultation_fee": Decimal(str(fee)),
                    "bio": f"Bác sĩ {full_name} có {exp} năm kinh nghiệm tại chuyên khoa {specialties[sp_idx].name}.",
                    "is_available": True,
                },
            )
            doctors.append(doctor)

        self.stdout.write(f"  ✔ Bác sĩ: {len(doctors)}")
        return doctors

    # ── PATIENTS ─────────────────────────────────────────────
    def _seed_patients(self):
        from clinic_app.models.patient import Patient

        patients = []
        for full_name, username, email, dob, gender, phone, blood, insurance in PATIENTS_DATA:
            last, *first_parts = full_name.split()
            first = " ".join(first_parts) if first_parts else last

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
                user.set_password("Patient@123")
                user.save()

            patient, _ = Patient.objects.get_or_create(
                user=user,
                defaults={
                    "date_of_birth": date.fromisoformat(dob),
                    "gender": gender,
                    "phone": phone,
                    "blood_type": blood,
                    "insurance_number": insurance,
                    "emergency_contact": f"Người thân – {phone[:-2]}99",
                },
            )
            patients.append(patient)

        self.stdout.write(f"  ✔ Bệnh nhân: {len(patients)}")
        return patients

    # ── STAFF ────────────────────────────────────────────────
    def _seed_staff(self, specialties):
        from clinic_app.models.staff import Staff

        staff_list = []
        for full_name, username, email, position, phone, sp_idx in STAFF_DATA:
            last, *first_parts = full_name.split()
            first = " ".join(first_parts) if first_parts else last

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
                user.set_password("Staff@123")
                user.save()

            sp = specialties[sp_idx] if sp_idx is not None else None
            staff, _ = Staff.objects.get_or_create(
                user=user,
                defaults={
                    "department": sp,
                    "position": position,
                    "phone": phone,
                },
            )
            staff_list.append(staff)

        self.stdout.write(f"  ✔ Nhân viên y tế: {len(staff_list)}")
        return staff_list

    # ── DOCTOR SCHEDULES ─────────────────────────────────────
    def _seed_schedules(self, doctors):
        from clinic_app.models.doctor import DoctorSchedule

        schedules = []
        today = date.today()
        time_slots = [
            (time(7, 30), time(11, 30)),
            (time(13, 0), time(17, 0)),
        ]

        for doctor in doctors:
            for delta in range(-7, 15):  # 7 ngày trước → 14 ngày tới
                sched_date = today + timedelta(days=delta)
                # Bỏ qua Chủ nhật
                if sched_date.weekday() == 6:
                    continue
                # Mỗi bác sĩ làm 1 ca ngẫu nhiên
                start_t, end_t = random.choice(time_slots)
                sched, _ = DoctorSchedule.objects.get_or_create(
                    doctor=doctor,
                    date=sched_date,
                    start_time=start_t,
                    defaults={
                        "end_time": end_t,
                        "max_appointments": random.randint(8, 15),
                        "is_available": delta >= 0,  # quá khứ đánh dấu unavailable
                    },
                )
                schedules.append(sched)

        self.stdout.write(f"  ✔ Lịch làm việc: {len(schedules)}")
        return schedules

    # ── APPOINTMENTS ─────────────────────────────────────────
    def _seed_appointments(self, patients, doctors, schedules, services):
        from clinic_app.models.appointment import Appointment, AppointmentService

        # Phân loại trạng thái để seed phủ đủ các case
        status_pool = (
            [Appointment.Status.COMPLETED]  * 20 +
            [Appointment.Status.CONFIRMED]  * 7  +
            [Appointment.Status.PENDING]    * 5  +
            [Appointment.Status.CANCELLED]  * 4  +
            [Appointment.Status.NO_SHOW]    * 2  +
            [Appointment.Status.IN_PROGRESS]* 2
        )
        random.shuffle(status_pool)

        appointments = []
        used_slots = set()  # (patient_id, doctor_id, datetime)
        today = date.today()

        for i, status in enumerate(status_pool):
            patient = random.choice(patients)
            doctor  = random.choice(doctors)

            # Chọn schedule phù hợp với status
            if status in (Appointment.Status.COMPLETED, Appointment.Status.NO_SHOW, Appointment.Status.CANCELLED):
                delta = -random.randint(1, 30)
            elif status == Appointment.Status.IN_PROGRESS:
                delta = 0
            else:
                delta = random.randint(1, 14)

            appt_date = timezone.make_aware(
                timezone.datetime(
                    *(today + timedelta(days=delta)).timetuple()[:3],
                    random.choice([8, 9, 10, 13, 14, 15]),
                    random.choice([0, 30]),
                )
            )

            slot_key = (patient.id, doctor.id, appt_date)
            if slot_key in used_slots:
                continue
            used_slots.add(slot_key)

            sched = next(
                (s for s in schedules if s.doctor == doctor and s.date == appt_date.date()),
                None,
            )

            appt = Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                schedule=sched,
                appointment_date=appt_date,
                status=status,
                reason=random.choice(APPOINTMENT_REASONS),
                notes="Ghi chú tự động từ hệ thống seed." if random.random() > 0.6 else "",
            )
            appointments.append(appt)

            # Thêm 1–3 dịch vụ cho mỗi lịch hẹn (trừ cancelled)
            if status != Appointment.Status.CANCELLED:
                dr_services = [s for s in services if s.specialty == doctor.specialty]
                if not dr_services:
                    dr_services = services[:5]
                chosen = random.sample(dr_services, min(random.randint(1, 3), len(dr_services)))
                for svc in chosen:
                    AppointmentService.objects.create(
                        appointment=appt,
                        service=svc,
                        quantity=1,
                        price_at_time=svc.price,
                    )

        self.stdout.write(f"  ✔ Lịch hẹn: {len(appointments)}")
        return appointments

    # ── CONSULTATIONS ────────────────────────────────────────
    def _seed_consultations(self, appointments, doctors, patients):
        from clinic_app.models.consultation import Consultation, ChatMessage
        from clinic_app.models.appointment  import Appointment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        consult_sample = random.sample(completed, min(15, len(completed)))
        consultations = []

        for appt in consult_sample:
            c_type = random.choice([Consultation.Type.CHAT, Consultation.Type.VIDEO])
            started = appt.appointment_date
            ended   = started + timedelta(minutes=random.randint(15, 60))

            consultation = Consultation.objects.create(
                appointment=appt,
                type=c_type,
                room_id=f"ROOM-{uuid.uuid4().hex[:8].upper()}",
                room_url=f"https://meet.hospital.vn/room/{uuid.uuid4().hex[:8]}" if c_type == Consultation.Type.VIDEO else "",
                status=Consultation.Status.ENDED,
                started_at=started,
                ended_at=ended,
            )
            consultations.append(consultation)

            # Chat messages
            symptom = random.choice(["đau đầu", "đau bụng", "sốt cao", "khó thở", "mệt mỏi"])
            doctor_user  = appt.doctor.user
            patient_user = appt.patient.user
            for is_doctor, msg_tmpl in CHAT_MESSAGES_TEMPLATE:
                sender = doctor_user if is_doctor else patient_user
                ChatMessage.objects.create(
                    consultation=consultation,
                    sender=sender,
                    message=msg_tmpl.format(symptom=symptom),
                    is_read=True,
                )

        self.stdout.write(f"  ✔ Tư vấn online: {len(consultations)}")
        return consultations

    # ── MEDICAL RECORDS ──────────────────────────────────────
    def _seed_medical_records(self, appointments, doctors, patients, staff_list):
        from clinic_app.models.medical_record import MedicalRecord, TestResult
        from clinic_app.models.appointment    import Appointment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        records = []

        test_type_choices = [
            (TestResult.TestType.BLOOD,      "Công thức máu toàn phần",    "Bình thường",        "cells/μL", "4.0–11.0"),
            (TestResult.TestType.BLOOD,      "Đường huyết lúc đói",        "5.8",                "mmol/L",   "3.9–6.1"),
            (TestResult.TestType.BLOOD,      "Cholesterol toàn phần",      "5.2",                "mmol/L",   "< 5.2"),
            (TestResult.TestType.URINE,      "Tổng phân tích nước tiểu",   "Không có bất thường","",         "Âm tính"),
            (TestResult.TestType.ULTRASOUND, "Siêu âm ổ bụng tổng quát",  "Gan, lách bình thường, không u","",""),
            (TestResult.TestType.XRAY,       "X-quang ngực thẳng",         "Hai phổi sáng, không thâm","",""),
            (TestResult.TestType.ECG,        "Điện tâm đồ 12 chuyển đạo", "Nhịp xoang đều, 72 lần/phút","bpm","60–100"),
            (TestResult.TestType.CT,         "CT não không cản quang",     "Không có xuất huyết, nhồi máu","",""),
        ]

        lab_staff = next((s for s in staff_list if s.position == "lab_tech"), None)
        if not lab_staff and staff_list:
            lab_staff = staff_list[0]

        for idx, appt in enumerate(completed):
            follow_up = (appt.appointment_date + timedelta(days=random.choice([14, 30, 60]))).date()
            record = MedicalRecord.objects.create(
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                diagnosis=DIAGNOSES[idx % len(DIAGNOSES)],
                symptoms=SYMPTOMS[idx % len(SYMPTOMS)],
                treatment_notes=TREATMENT_NOTES[idx % len(TREATMENT_NOTES)],
                follow_up_date=follow_up,
            )
            records.append(record)

            # Tạo 1–3 kết quả cận lâm sàng
            chosen_tests = random.sample(test_type_choices, random.randint(1, 3))
            for t_type, t_name, t_result, t_unit, t_ref in chosen_tests:
                TestResult.objects.create(
                    medical_record=record,
                    test_type=t_type,
                    test_name=t_name,
                    result=t_result,
                    unit=t_unit,
                    reference_range=t_ref,
                    test_date=appt.appointment_date.date(),
                    entered_by=lab_staff,
                )

        self.stdout.write(f"  ✔ Hồ sơ bệnh án: {len(records)}")
        return records

    # ── PRESCRIPTIONS ────────────────────────────────────────
    def _seed_prescriptions(self, records, medicines, staff_list):
        from clinic_app.models.prescription import Prescription, PrescriptionDetail

        pharmacist = next((s for s in staff_list if s.position == "pharmacist"), None)
        if not pharmacist and staff_list:
            pharmacist = staff_list[0]

        prescriptions = []
        dosage_opts   = ["1 viên", "2 viên", "1/2 viên"]
        freq_opts     = ["2 lần/ngày (sáng – tối)", "3 lần/ngày (sáng – trưa – tối)", "1 lần/ngày (buổi tối)"]
        instr_opts    = [
            "Uống sau ăn 30 phút với nhiều nước.",
            "Uống trước ăn 30 phút.",
            "Uống cùng bữa ăn để tránh kích ứng dạ dày.",
            "Không nhai, nuốt cả viên.",
        ]

        for record in records:
            # ~70% hồ sơ có đơn thuốc
            if random.random() > 0.7:
                continue

            is_dispensed = random.random() > 0.3
            dispensed_at = (
                timezone.now() - timedelta(hours=random.randint(1, 48))
                if is_dispensed else None
            )

            presc = Prescription.objects.create(
                medical_record=record,
                status=Prescription.Status.DISPENSED if is_dispensed else Prescription.Status.PENDING,
                notes="Bệnh nhân được tư vấn kỹ về cách dùng thuốc.",
                dispensed_at=dispensed_at,
                dispensed_by=pharmacist if is_dispensed else None,
            )
            prescriptions.append(presc)

            # 2–4 thuốc trong đơn
            chosen_meds = random.sample(medicines, random.randint(2, 4))
            for med in chosen_meds:
                qty = random.randint(10, 30)
                PrescriptionDetail.objects.create(
                    prescription=presc,
                    medicine=med,
                    quantity=qty,
                    dosage=random.choice(dosage_opts),
                    frequency=random.choice(freq_opts),
                    duration_days=random.choice([5, 7, 10, 14, 30]),
                    instructions=random.choice(instr_opts),
                    price_at_time=med.price,
                )

        self.stdout.write(f"  ✔ Đơn thuốc: {len(prescriptions)}")
        return prescriptions

    # ── INVOICES & PAYMENTS ──────────────────────────────────
    def _seed_invoices_payments(self, appointments):
        from clinic_app.models.appointment import Appointment
        from clinic_app.models.payment     import Invoice, Payment

        completed = [a for a in appointments if a.status == Appointment.Status.COMPLETED]
        confirmed = [a for a in appointments if a.status == Appointment.Status.CONFIRMED]
        billable  = completed + confirmed[:3]

        invoice_count = 0
        payment_count = 0

        for appt in billable:
            invoice, created = Invoice.objects.get_or_create(appointment=appt)
            if not created:
                continue
            invoice_count += 1

            total = invoice.total_amount
            method = random.choice(list(Payment.Method.values))
            prefix = {"momo": "MOMO", "vnpay": "VNP", "credit_card": "CC", "cash": "CASH", "banking": "BANK"}[method]
            txn_id = f"{prefix}{uuid.uuid4().hex[:10].upper()}"

            # Lịch hẹn hoàn thành → thanh toán thành công
            if appt.status == Appointment.Status.COMPLETED:
                Payment.objects.create(
                    invoice=invoice,
                    amount=total,
                    payment_method=method,
                    status=Payment.Status.SUCCESS,
                    transaction_id=txn_id,
                    note="Thanh toán toàn bộ hóa đơn",
                    paid_at=timezone.now() - timedelta(hours=random.randint(1, 72)),
                )
                payment_count += 1

                # 10% có hoàn tiền
                if random.random() < 0.1:
                    Payment.objects.create(
                        invoice=invoice,
                        amount=total * Decimal("0.2"),
                        payment_method=method,
                        status=Payment.Status.REFUNDED,
                        transaction_id=f"REF{uuid.uuid4().hex[:8].upper()}",
                        note="Hoàn tiền dịch vụ không thực hiện",
                        paid_at=timezone.now() - timedelta(hours=random.randint(1, 24)),
                    )
                    payment_count += 1

            else:  # confirmed → chờ thanh toán
                Payment.objects.create(
                    invoice=invoice,
                    amount=total,
                    payment_method=method,
                    status=Payment.Status.PENDING,
                    transaction_id=txn_id,
                    note="Chờ xác nhận thanh toán",
                )
                payment_count += 1

        # Thêm 3 giao dịch thất bại
        for appt in random.sample(completed[:10], min(3, len(completed))):
            try:
                inv = Invoice.objects.get(appointment=appt)
                Payment.objects.create(
                    invoice=inv,
                    amount=inv.total_amount,
                    payment_method=random.choice([Payment.Method.MOMO, Payment.Method.VNPAY]),
                    status=Payment.Status.FAILED,
                    transaction_id=f"FAIL{uuid.uuid4().hex[:8].upper()}",
                    note="Giao dịch thất bại – lỗi cổng thanh toán",
                )
                payment_count += 1
            except Invoice.DoesNotExist:
                pass

        self.stdout.write(f"  ✔ Hóa đơn: {invoice_count} | Thanh toán: {payment_count}")

    # ── INVENTORY ────────────────────────────────────────────
    def _seed_inventory(self, medicines):
        from clinic_app.models.medicine import Inventory, InventoryAlert

        inv_count   = 0
        alert_count = 0
        suppliers   = ["Dược Hậu Giang", "Pymepharco", "OPC Pharma", "Traphaco", "Imexpharm"]

        for med in medicines:
            for batch_num in range(1, random.randint(2, 4)):
                is_low      = random.random() < 0.15
                is_expiring = random.random() < 0.1
                is_expired  = random.random() < 0.05

                qty     = random.randint(3, 8)  if is_low      else random.randint(50, 500)
                exp_delta = random.randint(-10, 20) if is_expired else (
                    random.randint(20, 45) if is_expiring else random.randint(90, 730)
                )
                expiry = date.today() + timedelta(days=exp_delta)

                inv = Inventory.objects.create(
                    medicine=med,
                    batch_number=f"LOT{med.code}-{batch_num:02d}",
                    quantity=qty,
                    expiry_date=expiry,
                    import_date=date.today() - timedelta(days=random.randint(10, 180)),
                    import_price=med.price * Decimal("0.6"),
                    supplier=random.choice(suppliers),
                    warning_threshold=10,
                )
                inv_count += 1

                # Sinh cảnh báo tương ứng
                if is_expired:
                    InventoryAlert.objects.create(
                        medicine=med, inventory=inv,
                        alert_type=InventoryAlert.AlertType.EXPIRED,
                        message=f"Lô {inv.batch_number} của {med.name} đã hết hạn vào {expiry}.",
                    )
                    alert_count += 1
                elif is_expiring:
                    InventoryAlert.objects.create(
                        medicine=med, inventory=inv,
                        alert_type=InventoryAlert.AlertType.NEAR_EXPIRY,
                        message=f"Lô {inv.batch_number} của {med.name} sẽ hết hạn trong {exp_delta} ngày.",
                    )
                    alert_count += 1

                if is_low:
                    InventoryAlert.objects.create(
                        medicine=med, inventory=inv,
                        alert_type=InventoryAlert.AlertType.LOW_STOCK,
                        message=f"{med.name} lô {inv.batch_number} còn {qty} đơn vị – dưới ngưỡng cảnh báo.",
                    )
                    alert_count += 1

        self.stdout.write(f"  ✔ Tồn kho: {inv_count} lô | Cảnh báo: {alert_count}")

    # ── NOTIFICATIONS ────────────────────────────────────────
    def _seed_notifications(self, patients, doctors, appointments, prescriptions):
        from clinic_app.models.notification import Notification
        from clinic_app.models.appointment  import Appointment
        from clinic_app.models.payment      import Invoice, Payment

        notifs = []
        now    = timezone.now()

        # 1. Nhắc lịch hẹn – bệnh nhân
        upcoming = [a for a in appointments if a.status in (
            Appointment.Status.CONFIRMED, Appointment.Status.PENDING
        )]
        for appt in upcoming[:10]:
            notifs.append(Notification(
                user=appt.patient.user,
                title="Nhắc lịch khám",
                message=(
                    f"Bạn có lịch hẹn với BS. {appt.doctor.user.get_full_name()} "
                    f"vào {appt.appointment_date.strftime('%H:%M ngày %d/%m/%Y')}. "
                    "Vui lòng đến đúng giờ."
                ),
                type=Notification.Type.APPOINTMENT_REMINDER,
                related_object_id=appt.id,
                related_object_type=Notification.ObjectType.APPOINTMENT,
                is_read=random.random() > 0.5,
            ))

        # 2. Thanh toán thành công
        success_payments = Payment.objects.filter(status=Payment.Status.SUCCESS).select_related(
            "invoice__appointment__patient__user"
        )[:10]
        for pay in success_payments:
            notifs.append(Notification(
                user=pay.invoice.appointment.patient.user,
                title="Thanh toán thành công",
                message=f"Hóa đơn #{pay.invoice.pk:06d} đã thanh toán {pay.amount:,.0f}đ qua {pay.get_payment_method_display()}.",
                type=Notification.Type.PAYMENT_SUCCESS,
                related_object_id=pay.invoice.id,
                related_object_type=Notification.ObjectType.PAYMENT,
                is_read=random.random() > 0.3,
            ))

        # 3. Đơn thuốc sẵn sàng
        for presc in prescriptions[:10]:
            if presc.status == "dispensed":
                notifs.append(Notification(
                    user=presc.medical_record.patient.user,
                    title="Đơn thuốc đã sẵn sàng",
                    message=f"Đơn thuốc #{presc.pk} đã được cấp phát. Vui lòng đến nhận tại quầy dược.",
                    type=Notification.Type.PRESCRIPTION_READY,
                    related_object_id=presc.id,
                    related_object_type=Notification.ObjectType.PRESCRIPTION,
                    is_read=False,
                ))

        # # 4. Cảnh báo kho – admin
        # from clinic_app.models.medicine import InventoryAlert
        # alerts = InventoryAlert.objects.filter(is_resolved=False)[:5]
        # admin_user = User.objects.filter(is_superuser=True).first()
        # if admin_user:
        #     for alert in alerts:
        #         notifs.append(Notification(
        #             user=admin_user,
        #             title=f"Cảnh báo kho: {alert.get_alert_type_display()}",
        #             message=alert.message,
        #             type=Notification.Type.INVENTORY_ALERT,
        #             related_object_id=alert.inventory_id,
        #             related_object_type=Notification.ObjectType.INVENTORY,
        #             is_read=False,
        #         ))

        # 5. Thông báo hệ thống — chỉ gửi cho seeded users (patients + doctors được seed)
        seeded_users = [p.user for p in patients[:10]] + [d.user for d in doctors[:5]]
        sys_msgs = [
            ("Cập nhật hệ thống", "Hệ thống sẽ bảo trì lúc 02:00 ngày mai, dự kiến 30 phút."),
            ("Chính sách mới",    "Bệnh viện áp dụng chính sách thanh toán không dùng tiền mặt từ 01/08/2025."),
        ]
        for user in seeded_users:
            msg_title, msg_body = random.choice(sys_msgs)
            notifs.append(Notification(
                user=user,
                title=msg_title,
                message=msg_body,
                type=Notification.Type.SYSTEM,
                is_read=random.random() > 0.4,
            ))

        Notification.objects.bulk_create(notifs)
        self.stdout.write(f"  ✔ Thông báo: {len(notifs)}")

    # ── SUMMARY ──────────────────────────────────────────────
    def _print_summary(self):
        from clinic_app.models.specialty      import Specialty, Service
        from clinic_app.models.medicine       import Medicine, Inventory, InventoryAlert
        from clinic_app.models.doctor         import Doctor, DoctorSchedule
        from clinic_app.models.patient        import Patient
        from clinic_app.models.staff          import Staff
        from clinic_app.models.appointment    import Appointment, AppointmentService
        from clinic_app.models.consultation   import Consultation, ChatMessage
        from clinic_app.models.medical_record import MedicalRecord, TestResult
        from clinic_app.models.prescription   import Prescription, PrescriptionDetail
        from clinic_app.models.payment        import Invoice, Payment
        from clinic_app.models.notification   import Notification

        rows = [
            ("👤 Users",             User.objects.count()),
            ("🏥 Chuyên khoa",       Specialty.objects.count()),
            ("🩺 Dịch vụ y tế",      Service.objects.count()),
            ("💊 Danh mục thuốc",    __import__("clinic_app.models.medicine",
                                                 fromlist=["MedicineCategory"])
                                                 .MedicineCategory.objects.count()),
            ("💊 Thuốc",             Medicine.objects.count()),
            ("📦 Tồn kho (lô)",      Inventory.objects.count()),
            ("⚠️  Cảnh báo kho",      InventoryAlert.objects.count()),
            ("👨‍⚕️ Bác sĩ",            Doctor.objects.count()),
            ("📅 Lịch làm việc",     DoctorSchedule.objects.count()),
            ("🤒 Bệnh nhân",         Patient.objects.count()),
            ("👷 Nhân viên y tế",    Staff.objects.count()),
            ("📋 Lịch hẹn",          Appointment.objects.count()),
            ("🛎️  Dịch vụ/lịch hẹn", AppointmentService.objects.count()),
            ("💬 Tư vấn online",     Consultation.objects.count()),
            ("📨 Tin nhắn chat",     ChatMessage.objects.count()),
            ("📁 Hồ sơ bệnh án",    MedicalRecord.objects.count()),
            ("🔬 Kết quả CLS",       TestResult.objects.count()),
            ("💉 Đơn thuốc",         Prescription.objects.count()),
            ("📝 Chi tiết đơn",      PrescriptionDetail.objects.count()),
            ("🧾 Hóa đơn",           Invoice.objects.count()),
            ("💳 Thanh toán",        Payment.objects.count()),
            ("🔔 Thông báo",         Notification.objects.count()),
        ]
        self.stdout.write(self.style.MIGRATE_HEADING("\n📊 TỔNG KẾT DỮ LIỆU SEED"))
        self.stdout.write("─" * 38)
        for label, count in rows:
            self.stdout.write(f"  {label:<28} {count:>5}")
        self.stdout.write("─" * 38)
        self.stdout.write(self.style.SUCCESS("\n🔑 Tài khoản mặc định:"))
        self.stdout.write("  Bác sĩ    dr_an … dr_lan / Doctor@123")
        self.stdout.write("  Bệnh nhân patient_mai … / Patient@123")
        self.stdout.write("  Nhân viên  staff_ha …    / Staff@123\n")