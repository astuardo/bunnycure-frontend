const fs = require('fs');
const path = require('path');

const webPushPath = path.resolve(__dirname, '../../bunnycure/src/main/java/cl/bunnycure/service/WebPushNotificationService.java');
let content = fs.readFileSync(webPushPath, 'utf8');

const isCRLF = content.includes('\r\n');
let lf = content.replace(/\r\n/g, '\n');

const customPushMethod = `
    public void sendAdminCustomNotification(String title, String body, String url) {
        if (!webPushEnabled) {
            log.debug("[WEB-PUSH] Deshabilitado por configuración");
            return;
        }

        if (!isWebPushConfigured()) {
            log.warn("[WEB-PUSH] Falta configuración VAPID.");
            return;
        }

        List<WebPushSubscription> subscriptions = subscriptionRepository.findByActiveTrue();
        if (subscriptions.isEmpty()) {
            return;
        }

        Map<String, Object> payloadMap = new LinkedHashMap<>();
        payloadMap.put("title", title);
        payloadMap.put("body", body);
        payloadMap.put("icon", "/icon-192.png");
        payloadMap.put("badge", "/icon-192.png");
        payloadMap.put("url", url != null ? url : "/calendar");
        payloadMap.put("tag", "unavailability-" + System.currentTimeMillis());

        String payload;
        try {
            payload = objectMapper.writeValueAsString(payloadMap);
        } catch (JsonProcessingException ex) {
            log.error("[WEB-PUSH] Error serializando payload custom: {}", ex.getMessage());
            return;
        }

        PushService pushService = buildPushService();
        if (pushService == null) {
            return;
        }

        for (WebPushSubscription subscription : subscriptions) {
            sendToSubscription(pushService, subscription, payload);
        }
    }
`;

if (!lf.includes('sendAdminCustomNotification')) {
  const target = 'public Map<String, Object> getDiagnostics() {';
  const targetIndex = lf.indexOf(target);
  if (targetIndex !== -1) {
    // Find preceding line break and indentation
    const methodStart = lf.lastIndexOf('\n', targetIndex - 1);
    lf = lf.substring(0, methodStart) + '\n' + customPushMethod + '\n' + lf.substring(methodStart + 1);
    console.log('Inserted sendAdminCustomNotification into WebPushNotificationService');
  } else {
    console.error('Target getDiagnostics not found in WebPushNotificationService');
  }
}

if (isCRLF) {
  lf = lf.replace(/\n/g, '\r\n');
}

fs.writeFileSync(webPushPath, lf, 'utf8');
console.log('Updated WebPushNotificationService.java');
