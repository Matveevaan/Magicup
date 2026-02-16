# accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from .models import User, Purchase, LoyaltySettings
import re

# Валидационные функции
def validate_phone(value):
    pattern = r'^\+7\d{10}$'
    if not re.match(pattern, value):
        raise serializers.ValidationError("Телефон в формате: '+79999999999'")
    return value

def validate_name(value):
    pattern = r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$'
    if not re.match(pattern, value):
        raise serializers.ValidationError("Только буквы, пробелы и дефисы")
    return value

# Сериализатор для регистрации
class UserRegistrationSerializer(serializers.ModelSerializer):
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Подтверждение пароля'
    )
    
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password', 'password_confirm']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': False},
            'phone': {'required': False, 'allow_blank': True},
        }
    
    def validate(self, data):
        print(f"\n=== Serializer validate called ===")
        print(f"Data received: {data}")
        
        # Проверка наличия обязательных полей
        required_fields = ['email', 'first_name', 'password', 'password_confirm']
        for field in required_fields:
            if field not in data:
                raise serializers.ValidationError({field: f'Обязательное поле: {field}'})
        
        # Проверка совпадения паролей
        if data['password'] != data['password_confirm']:
            print("❌ Passwords do not match")
            raise serializers.ValidationError({
                'password_confirm': 'Пароли не совпадают'
            })
        print("✅ Passwords match")
        
        # Валидация пароля Django
        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(data['password'])
            print("✅ Password passed Django validation")
        except ValidationError as e:
            print(f"❌ Password validation failed: {e.messages}")
            raise serializers.ValidationError({
                'password': list(e.messages)
            })
        
        # Валидация email
        try:
            from django.core.validators import validate_email
            validate_email(data['email'])
            print("✅ Email format valid")
        except ValidationError:
            print("❌ Invalid email format")
            raise serializers.ValidationError({
                'email': 'Введите корректный email адрес'
            })
        
        # Проверка уникальности email
        if User.objects.filter(email=data['email']).exists():
            print(f"❌ Email {data['email']} already exists")
            raise serializers.ValidationError({
                'email': 'Пользователь с таким email уже существует'
            })
        print("✅ Email is unique")
        
        # Валидация имени
        if 'first_name' in data and data['first_name']:
            import re
            if not re.match(r'^[a-zA-Zа-яА-ЯёЁ\s\-]+$', data['first_name']):
                print("❌ Invalid first name format")
                raise serializers.ValidationError({
                    'first_name': 'Только буквы, пробелы и дефисы'
                })
            print("✅ First name valid")
        
        # Валидация телефона (если передан)
        if 'phone' in data and data['phone']:
            import re
            if not re.match(r'^\+7\d{10}$', data['phone']):
                print(f"❌ Invalid phone format: {data['phone']}")
                raise serializers.ValidationError({
                    'phone': "Телефон в формате: '+79999999999'"
                })
            print("✅ Phone valid")
        
        print("=== Serializer validate completed successfully ===\n")
        return data
    
    def create(self, validated_data):
        print(f"\n=== Creating user with data: {validated_data}")
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(**validated_data)
        print(f"✅ User created: {user.id} - {user.email}")
        return user

# Сериализатор для входа
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                email=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError({
                    'non_field_errors': 'Неверный email или пароль'
                })
            
            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': 'Аккаунт деактивирован'
                })
            
            data['user'] = user
        else:
            raise serializers.ValidationError({
                'non_field_errors': 'Необходимо указать email и пароль'
            })
        
        return data

# Сериализатор профиля
class UserProfileSerializer(serializers.ModelSerializer):
    barcode_image = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(format='%d.%m.%Y %H:%M', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone', 'points',
            'total_spent', 'visits_count', 'last_visit',
            'barcode', 'barcode_image', 'date_joined',
            'is_staff', 'is_superuser'
        ]
        read_only_fields = fields
    
    def get_barcode_image(self, obj):
        return obj.get_barcode_image_base64()

# Сериализатор обновления профиля
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name','phone', 'email']
        extra_kwargs = {
            'first_name': {'validators': [validate_name]},
            'last_name': {'validators': [validate_name], 'required': False, 'allow_blank': True},
            'phone': {'validators': [validate_phone], 'required': False, 'allow_blank': True}
        }
    
    def validate_email(self, value):
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError('Введите корректный email адрес')
        
        user = self.context['request'].user
        if User.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError('Этот email уже используется')
        
        return value

# Сериализатор смены пароля
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Неверный текущий пароль')
        return value
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Новые пароли не совпадают'
            })
        
        if data['old_password'] == data['new_password']:
            raise serializers.ValidationError({
                'new_password': 'Новый пароль должен отличаться от старого'
            })
        
        try:
            validate_password(data['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({
                'new_password': list(e.messages)
            })
        
        return data

# Сериализатор истории покупок
class PurchaseHistorySerializer(serializers.ModelSerializer):
    purchase_date = serializers.DateTimeField(format='%d.%m.%Y %H:%M', read_only=True)
    
    class Meta:
        model = Purchase
        fields = [
            'id', 'total_amount', 'final_amount', 
            'points_used', 'points_earned', 
            'purchase_date', 'items_summary', 'items_detail'
        ]
        read_only_fields = fields

# Сериализатор для админки (полный юзер)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'phone',
            'points', 'total_spent', 'visits_count', 'last_visit',
            'barcode', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['date_joined']

# Сериализатор настроек лояльности
class LoyaltySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltySettings
        fields = ['id', 'points_percentage', 'max_points_per_use', 'updated_at']
        read_only_fields = ['id', 'updated_at']

