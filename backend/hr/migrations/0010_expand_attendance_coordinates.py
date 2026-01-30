from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0009_alter_attendanceotprequest_company"),
    ]

    operations = [
        migrations.AlterField(
            model_name="attendancerecord",
            name="check_in_lat",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
        migrations.AlterField(
            model_name="attendancerecord",
            name="check_in_lng",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
        migrations.AlterField(
            model_name="attendancerecord",
            name="check_out_lat",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
        migrations.AlterField(
            model_name="attendancerecord",
            name="check_out_lng",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=18, null=True),
        ),
    ]