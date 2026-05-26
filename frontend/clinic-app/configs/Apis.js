import axios from "axios";

// Thay IP này bằng IP máy tính đang chạy Django (xem bằng ipconfig/ifconfig)
// Android Emulator dùng: http://10.0.2.2:8000
// Thiết bị thật: dùng IP WiFi của máy tính, ví dụ: http://192.168.1.x:8000
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const endpoints = {
    // Auth
    'register': '/auth/register/',
    'login': '/auth/login/',
    'current-user': '/auth/me/',
    'change-password': '/auth/change-password/',

    // Specialties & Services
    'specialties': '/specialties/',
    'services': '/services/',

    // Doctors
    'doctors': '/doctors/',
    'doctor-detail': (id) => `/doctors/${id}/`,
    'doctor-schedules': (id) => `/doctors/${id}/schedules/`,
    'doctor-appointments': (id) => `/doctors/${id}/appointments/`,

    // Doctor Dashboard & Tools
    'doctor-dashboard': '/doctor/dashboard/',
    'doctor-my-schedules': '/doctor/my-schedules/',
    'doctor-today-appointments': '/doctor/today-appointments/',

    // Schedules (tạo/sửa lịch làm việc)
    'schedules': '/schedules/',
    'schedule-detail': (id) => `/schedules/${id}/`,

    // Staff Dashboard & Tools
    'staff-dashboard': '/staff/dashboard/',
    'staff-patients': '/staff/patients/',
    'staff-patient-detail': (id) => `/staff/patients/${id}/`,
    'staff-payments': '/staff/payments/',
    'staff-inventory-alerts': '/staff/inventory-alerts/',

    // Appointments
    'appointments': '/appointments/',
    'appointment-detail': (id) => `/appointments/${id}/`,
    'appointment-status': (id) => `/appointments/${id}/status/`,
    'appointment-add-service': (id) => `/appointments/${id}/add_service/`,

    // Medical Records
    'medical-records': '/medical-records/',
    'medical-record-detail': (id) => `/medical-records/${id}/`,
    'medical-record-add-test': (id) => `/medical-records/${id}/add_test_result/`,

    // Prescriptions
    'prescriptions': '/prescriptions/',
    'prescription-detail': (id) => `/prescriptions/${id}/`,
    'prescription-dispense': (id) => `/prescriptions/${id}/dispense/`,
    'prescription-add-medicine': (id) => `/prescriptions/${id}/add_medicine/`,

    // Payments
    'payments': '/payments/',
    'payment-init': '/payments/init/',
    'payment-confirm': (id) => `/payments/${id}/confirm/`,
    'payment-detail': (id) => `/payments/${id}/`,

    // Medicines & Inventory
    'medicine-categories': '/medicine-categories/',
    'medicines': '/medicines/',
    'inventory': '/inventory/',
    'inventory-detail': (id) => `/inventory/${id}/`,
    'inventory-low-stock': '/inventory/low_stock/',
    'inventory-near-expiry': '/inventory/near_expiry/',
    'inventory-alerts': '/inventory-alerts/',
    'inventory-alert-resolve': (id) => `/inventory-alerts/${id}/resolve/`,

    // Notifications
    'notifications': '/notifications/',
    'notification-read': (id) => `/notifications/${id}/read/`,
    'notification-read-all': '/notifications/read_all/',

    // Patients
    'patients': '/patients/',
    'patient-detail': (id) => `/patients/${id}/`,
    'patient-appointments': (id) => `/patients/${id}/appointments/`,
    'patient-medical-records': (id) => `/patients/${id}/medical_records/`,

    // Consultations
    'consultations': '/consultations/',
    'consultation-detail': (id) => `/consultations/${id}/`,
    'consultation-enter': (id) => `/consultations/${id}/enter/`,
    'consultation-start': (id) => `/consultations/${id}/start/`,
    'consultation-end': (id) => `/consultations/${id}/end/`,
    'consultation-messages': (id) => `/consultations/${id}/messages/`,

    // Admin dashboard
    'admin-dashboard': '/admin/dashboard/',
    'admin-reports': '/admin/dashboard/reports/',
};

export const authApis = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

export default axios.create({
    baseURL: BASE_URL
});