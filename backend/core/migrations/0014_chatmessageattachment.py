from django.db import migrations, models

import core.models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_chatconversation_chatmessage_inappnotification_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatMessageAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.FileField(upload_to=core.models.chat_message_attachment_upload_to)),
                ("original_name", models.CharField(max_length=255)),
                ("file_size", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "message",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="attachments",
                        to="core.chatmessage",
                    ),
                ),
            ],
        ),
        migrations.AddIndex(
            model_name="chatmessageattachment",
            index=models.Index(fields=["message", "id"], name="chat_att_msg_id_idx"),
        ),
    ]