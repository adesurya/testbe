// pages/payment/success.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentSuccess() {
    const router = useRouter();
    const [paymentDetails, setPaymentDetails] = useState(null);

    useEffect(() => {
        const { orderId } = router.query;
        if (orderId) {
            fetchPaymentDetails(orderId);
        }
    }, [router.query]);

    const fetchPaymentDetails = async (orderId) => {
        try {
            const response = await fetch(`/api/payments/detail/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setPaymentDetails(data.data);
        } catch (error) {
            console.error('Error fetching payment details:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold text-green-600 mb-4">
                Payment Successful!
            </h1>
            {paymentDetails && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-xl mb-2">Payment Details</h2>
                    <p>Order ID: {paymentDetails.merchantOrderId}</p>
                    <p>Amount: Rp {paymentDetails.amount.toLocaleString()}</p>
                    <p>Plan: {paymentDetails.plan.name}</p>
                    <p>Message Limit: {paymentDetails.plan.messageLimit}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Go to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}

