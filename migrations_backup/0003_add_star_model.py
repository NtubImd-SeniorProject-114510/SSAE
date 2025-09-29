from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('web_app', '0002_coursereview'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Star',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stars', to='web_app.course')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='auth.user')),
            ],
            options={
                'db_table': 'web_app_CourseStar',
                'unique_together': {('course', 'user')},
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddField(
            model_name='coursereview',
            name='star',
            field=models.OneToOneField(null=True, blank=True, on_delete=django.db.models.deletion.CASCADE, related_name='review', to='web_app.star'),
        ),
    ]
