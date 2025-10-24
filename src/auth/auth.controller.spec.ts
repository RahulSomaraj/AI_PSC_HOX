import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { 
  ForgotPasswordDto, 
  ResetPasswordDto, 
  UpdatePasswordDto, 
  DeleteProfileDto,
  AuthPayloadDto 
} from './dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    deleteProfile: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    refreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens and set authorization header', async () => {
      const authPayload: AuthPayloadDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockRequest = { headers: { 'user-agent': 'test-agent' } };
      const mockResponse = {
        setHeader: jest.fn(),
      };

      const expectedResult = {
        message: 'Login successful',
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        sessionId: 'sessionId',
      };

      mockAuthService.validateUser.mockResolvedValue({
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        sessionId: 'sessionId',
      });

      const result = await controller.login(authPayload, mockRequest as any, mockResponse as any);

      expect(result).toEqual(expectedResult);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer accessToken');
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(authPayload, mockRequest);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };

      const expectedResult = {
        message: 'If the email exists, a password reset link has been sent.',
      };

      mockAuthService.forgotPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'resetToken',
        newPassword: 'NewPassword123!',
      };

      const expectedResult = {
        message: 'Password has been reset successfully. Please log in with your new password.',
      };

      mockAuthService.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('updatePassword', () => {
    it('should call authService.updatePassword with user ID', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'currentPassword123!',
        newPassword: 'NewPassword123!',
      };

      const expectedResult = {
        message: 'Password has been updated successfully. Please log in again.',
      };

      mockAuthService.updatePassword.mockResolvedValue(expectedResult);

      const result = await controller.updatePassword(1, updatePasswordDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(1, updatePasswordDto);
    });
  });

  describe('deleteProfile', () => {
    it('should call authService.deleteProfile with user ID', async () => {
      const deleteProfileDto: DeleteProfileDto = {
        password: 'currentPassword123!',
        reason: 'No longer need the service',
      };

      const expectedResult = {
        message: 'Your account has been successfully deleted. All your data has been removed and you will be logged out.',
      };

      mockAuthService.deleteProfile.mockResolvedValue(expectedResult);

      const result = await controller.deleteProfile(1, deleteProfileDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.deleteProfile).toHaveBeenCalledWith(1, deleteProfileDto);
    });
  });
});