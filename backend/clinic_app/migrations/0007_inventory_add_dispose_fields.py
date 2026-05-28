from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinic_app', '0006_add_warning_threshold_to_medicine'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventory',
            name='is_disposed',
            field=models.BooleanField(default=False, help_text='Đã xuất hủy'),
        ),
        migrations.AddField(
            model_name='inventory',
            name='disposed_at',
            field=models.DateTimeField(blank=True, null=True, help_text='Thời điểm xuất hủy'),
        ),
    ]
