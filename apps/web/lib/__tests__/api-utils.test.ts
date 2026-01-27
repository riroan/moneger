import {
  successResponse,
  successResponseWithMessage,
  errorResponse,
  listResponse,
  paginatedResponse,
  validateUserId,
  validateTransactionType,
  validateAmount,
} from '../api-utils';

describe('api-utils', () => {
  describe('successResponse', () => {
    it('기본 성공 응답을 생성해야 함', async () => {
      const data = { id: '1', name: 'test' };
      const response = successResponse(data);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('커스텀 상태 코드를 사용할 수 있어야 함', async () => {
      const data = { id: '1' };
      const response = successResponse(data, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('successResponseWithMessage', () => {
    it('메시지가 포함된 성공 응답을 생성해야 함', async () => {
      const data = { id: '1' };
      const response = successResponseWithMessage(data, 'Created successfully', 201);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Created successfully');
      expect(body.data).toEqual(data);
    });
  });

  describe('errorResponse', () => {
    it('에러 응답을 생성해야 함', async () => {
      const response = errorResponse('Something went wrong', 400);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Something went wrong');
    });

    it('기본 상태 코드는 400이어야 함', async () => {
      const response = errorResponse('Error');

      expect(response.status).toBe(400);
    });
  });

  describe('listResponse', () => {
    it('목록 응답을 생성해야 함', async () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = listResponse(data, 2);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.count).toBe(2);
    });
  });

  describe('paginatedResponse', () => {
    it('페이지네이션 응답을 생성해야 함', async () => {
      const data = [{ id: '1' }];
      const response = paginatedResponse(data, 1, 'next-cursor', true);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.count).toBe(1);
      expect(body.nextCursor).toBe('next-cursor');
      expect(body.hasMore).toBe(true);
    });

    it('마지막 페이지일 때 nextCursor가 null이어야 함', async () => {
      const data = [{ id: '1' }];
      const response = paginatedResponse(data, 1, null, false);
      const body = await response.json();

      expect(body.nextCursor).toBeNull();
      expect(body.hasMore).toBe(false);
    });
  });

  describe('validateUserId', () => {
    it('userId가 있으면 null을 반환해야 함', () => {
      const result = validateUserId('user-1');
      expect(result).toBeNull();
    });

    it('userId가 없으면 에러 응답을 반환해야 함', async () => {
      const result = validateUserId(null);
      expect(result).not.toBeNull();

      const body = await result!.json();
      expect(result!.status).toBe(400);
      expect(body.error).toBe('userId is required');
    });

    it('userId가 빈 문자열이면 에러 응답을 반환해야 함', async () => {
      const result = validateUserId('');
      expect(result).not.toBeNull();
    });
  });

  describe('validateTransactionType', () => {
    it('INCOME 타입은 유효해야 함', () => {
      const result = validateTransactionType('INCOME');
      expect(result).toBeNull();
    });

    it('EXPENSE 타입은 유효해야 함', () => {
      const result = validateTransactionType('EXPENSE');
      expect(result).toBeNull();
    });

    it('잘못된 타입은 에러 응답을 반환해야 함', async () => {
      const result = validateTransactionType('INVALID');
      expect(result).not.toBeNull();

      const body = await result!.json();
      expect(body.error).toBe('type must be INCOME or EXPENSE');
    });

    it('null 타입은 에러 응답을 반환해야 함', async () => {
      const result = validateTransactionType(null);
      expect(result).not.toBeNull();
    });
  });

  describe('validateAmount', () => {
    it('양수 금액은 유효해야 함', () => {
      const result = validateAmount(100);
      expect(result).toBeNull();
    });

    it('0 금액은 에러 응답을 반환해야 함', async () => {
      const result = validateAmount(0);
      expect(result).not.toBeNull();

      const body = await result!.json();
      expect(body.error).toBe('amount must be greater than 0');
    });

    it('음수 금액은 에러 응답을 반환해야 함', async () => {
      const result = validateAmount(-100);
      expect(result).not.toBeNull();
    });

    it('null 금액은 에러 응답을 반환해야 함', async () => {
      const result = validateAmount(null);
      expect(result).not.toBeNull();
    });

    it('undefined 금액은 에러 응답을 반환해야 함', async () => {
      const result = validateAmount(undefined);
      expect(result).not.toBeNull();
    });
  });
});
