import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Minimum 8 characters
          if (value.length < 8) return false;
          
          // At least one uppercase letter
          if (!/[A-Z]/.test(value)) return false;
          
          // At least one lowercase letter
          if (!/[a-z]/.test(value)) return false;
          
          // At least one number
          if (!/\d/.test(value)) return false;
          
          // At least one special character
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return false;
          
          // No common passwords
          const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
          ];
          
          if (commonPasswords.includes(value.toLowerCase())) return false;
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        }
      }
    });
  };
}

export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotCommonPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', 'master', 'hello', 'login', 'princess',
            'welcome', 'solo', 'starwars', 'freedom', 'whatever'
          ];
          
          return !commonPasswords.includes(value.toLowerCase());
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password is too common. Please choose a more secure password';
        }
      }
    });
  };
}

export function IsNotPersonalInfo(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotPersonalInfo',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const personalInfo = [
            'firstName', 'lastName', 'email', 'phone', 'birthday',
            'address', 'city', 'country', 'company', 'username'
          ];
          
          const lowerValue = value.toLowerCase();
          return !personalInfo.some(info => lowerValue.includes(info.toLowerCase()));
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password should not contain personal information';
        }
      }
    });
  };
}
