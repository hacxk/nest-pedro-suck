import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'match', async: false })
export class MatchPassword implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const [passwordProperty] = args.constraints;
    const object = args.object as any;
    return confirmPassword === object[passwordProperty];
  }

  defaultMessage(args: ValidationArguments) {
    return `$property must match ${args.constraints[0]}`;
  }
}
