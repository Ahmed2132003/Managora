from django.db import models
from django.utils.text import slugify
from django.contrib.auth.models import AbstractUser

class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("company") is None:
            raise ValueError("Superuser must have a company")

        return self.create_user(username, email, password, **extra_fields)


class User(AbstractUser):
    company = models.ForeignKey(
        "core.Company",
        on_delete=models.PROTECT,
        related_name="users",
    )
    objects = UserManager()
    def __str__(self):
        return self.username


