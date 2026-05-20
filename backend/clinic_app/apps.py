from django.apps import AppConfig


class ClinicAppConfig(AppConfig):
    name = "clinic_app"
    verbose_name = "Quản lý Phòng khám"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        import clinic_app.signals