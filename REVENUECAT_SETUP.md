# RevenueCat Setup

## Quick Setup

1. **Create a RevenueCat account:**
   - Go to https://app.revenuecat.com
   - Sign up for a free account
   - Create a new project (you can name it anything, e.g., "Protocol")
   - **Note:** When creating the project, you don't need to select a specific platform - you'll add both iOS and Android apps to the same project

2. **Add your apps:**
   - In your RevenueCat project, go to "Apps" → "Add app"
   - Add your **iOS app** first (you'll need your iOS Bundle ID)
   - Then add your **Android app** (you'll need your Android Package Name)
   - Copy the API keys for each platform (you'll get separate keys for iOS and Android)
   - **For React Native:** Your code will automatically use the correct API key based on the platform it's running on

## Current Configuration

### iOS Setup ✅
- **RevenueCat Project ID:** entl3f0dd99297
- **iOS SDK API Key:** appl_QUwdYYPCxhQMMSdqeenQUjeUSLZ
- **Bundle Identifier:** com.protocol.galdr
- **Status:** Configured in `src/services/subscriptionService.ts`

### Android Setup ⏳
- **Android SDK API Key:** Pending configuration
- **Package Name:** com.protocol.galdr

3. **Configure products in App Store Connect / Google Play Console:**
   - Set up subscription products:
     - Monthly subscription: $4.99/month
     - Annual subscription: $29.99/year (with 1-week free trial)
   - Note the Product IDs you create (e.g., `monthly_subscription`, `annual_subscription`)

4. **Configure products in RevenueCat:**
   - Go to Products → Products
   - Add your subscription products
   - Configure the 1-week free trial in RevenueCat
   - Create an entitlement called `premium`

5. **Add API keys to your app:**
   - ✅ iOS API key has been configured: `appl_QUwdYYPCxhQMMSdqeenQUjeUSLZ`
   - ⏳ Android API key: Replace `YOUR_ANDROID_API_KEY_HERE` in `src/services/subscriptionService.ts` when available
   - ✅ Product IDs configured:
     - Monthly: `com.protocol.galdr.monthly`
     - Annual: `com.protocol.galdr.yearly`

6. **Test in sandbox:**
   - Use RevenueCat's test mode to verify purchases work
   - Test both monthly and annual subscriptions
   - Verify free trial period works correctly

## Configuration Details

### Product Setup
- **Monthly Subscription:** $4.99/month with 1-week free trial
- **Annual Subscription:** $29.99/year with 1-week free trial (50% off messaging)
- **Entitlement:** Create an entitlement called `premium` that both products grant

### Free Trial
- 1 week free trial (payment method required upfront)
- Configured in App Store Connect / Google Play Console
- Also configure in RevenueCat for proper tracking

### Testing
- Use RevenueCat's sandbox/test mode for development
- Test subscription purchase flow
- Test restoration of purchases
- Test cancellation flow

## Security

⚠️ **IMPORTANT:**
- API keys are client-side (public) - this is normal for RevenueCat
- RevenueCat handles server-side receipt validation
- Never commit sensitive keys to git (though these are public keys, it's good practice)
- For production, ensure you've set up webhooks for subscription events

## Webhooks (Optional for MVP)

For production, consider setting up RevenueCat webhooks to:
- Track subscription cancellations in real-time
- Handle 6-month photo retention period
- Send deletion warnings 7 days before photo deletion

For MVP, client-side checks are sufficient.

## Troubleshooting

- **Purchases not working:** Verify API keys are correct and products are configured
- **Free trial not showing:** Check that free trial is configured in both App Store/Play Console AND RevenueCat
- **Entitlements not activating:** Verify products are linked to the `premium` entitlement in RevenueCat

## Related Files

- `src/services/subscriptionService.ts` - Main subscription logic
- `src/contexts/PremiumContext.tsx` - Premium state management
- `src/components/PaywallModal.tsx` - Paywall UI component

