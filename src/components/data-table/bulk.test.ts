import { runSequential } from './bulk';

describe('runSequential', () => {
  it('한 건 실패가 나머지를 막지 않는다', async () => {
    const r = await runSequential(
      [1, 2, 3],
      async (id) => {
        if (id === 2) throw new Error('이미 처리됨');
      },
      (e) => (e as Error).message,
    );
    expect(r).toEqual({ succeeded: [1, 3], failed: [{ id: 2, message: '이미 처리됨' }] });
  });
});
