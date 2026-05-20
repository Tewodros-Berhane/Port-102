import { createGlobalValidationPipe } from './app.setup';

describe('createGlobalValidationPipe', () => {
  it('enables strict global validation defaults', () => {
    const pipe = createGlobalValidationPipe() as unknown as {
      validatorOptions: {
        whitelist?: boolean;
        forbidNonWhitelisted?: boolean;
      };
      isTransformEnabled?: boolean;
    };

    expect(pipe.validatorOptions.whitelist).toBe(true);
    expect(pipe.validatorOptions.forbidNonWhitelisted).toBe(true);
    expect(pipe.isTransformEnabled).toBe(true);
  });
});
