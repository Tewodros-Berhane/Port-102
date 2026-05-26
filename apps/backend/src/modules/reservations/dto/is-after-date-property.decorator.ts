import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function getRecordValue(object: object, propertyName: string) {
  return (object as Record<string, unknown>)[propertyName];
}

export function IsAfterDateProperty(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterDateProperty',
      target: object.constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = getRecordValue(args.object, relatedProperty);

          if (
