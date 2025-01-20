// pages/payment/failed.js
export default function PaymentFailed() {
    const router = useRouter();
    const { orderId } = router.query;

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
                Payment Failed
            </h1>
            <p>Order ID: {orderId}</p>
            <p className="mb-4">
                Your payment was not successful. Please try again or contact support.
            </p>
            <button
                onClick={() => router.push('/plans')}
                className="bg-blue-500 text-white px-4 py-2 rounded"
            >
                Try Again
            </button>
        </div>
    );
}