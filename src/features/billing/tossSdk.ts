// 토스페이먼츠 결제위젯 SDK v2 (카드 등록 = 빌링 인증). 샌드박스에서만 불러온다
const SDK_URL = 'https://js.tosspayments.com/v2/standard';

type BillingAuthRequest = { method: 'CARD'; successUrl: string; failUrl: string };
type TossPayments = (clientKey: string) => { payment: (o: { customerKey: string }) => { requestBillingAuth: (o: BillingAuthRequest) => Promise<void> } };

declare global {
  interface Window {
    TossPayments?: TossPayments;
  }
}

export const tossClientKey = (): string => (import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined) ?? '';

let loading: Promise<TossPayments> | null = null;

export function loadTossSdk(): Promise<TossPayments> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error('토스 SDK를 불러오지 못했습니다')));
    s.onerror = () => {
      loading = null;
      reject(new Error('토스 SDK를 불러오지 못했습니다'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** 토스 카드 등록 창을 연다. 끝나면 successUrl·failUrl 로 페이지가 바뀐다 */
export async function requestCardRegistration(customerKey: string, returnUrl: string) {
  const TossPayments = await loadTossSdk();
  await TossPayments(tossClientKey())
    .payment({ customerKey })
    .requestBillingAuth({ method: 'CARD', successUrl: `${returnUrl}?result=success`, failUrl: `${returnUrl}?result=fail` });
}
