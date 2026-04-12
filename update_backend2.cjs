const fs = require('fs');

const filePath = 'C:\\Users\\alfre\\IdeaProjects\\bunnycure\\src\\main\\java\\cl\\bunnycure\\service\\WebPushNotificationService.java';
let content = fs.readFileSync(filePath, 'utf8');

// Inject AppSettingsService dependency
if (!content.includes('private final AppSettingsService appSettingsService;')) {
    content = content.replace(
        'private final ObjectMapper objectMapper;', 
        'private final ObjectMapper objectMapper;\n    private final AppSettingsService appSettingsService;'
    );
}

// Rewrite buildReminderPayload method
const methodRegex = /private String buildReminderPayload\(Appointment appointment, String reminderType\) \{[\s\S]*?catch \(JsonProcessingException ex\) \{[\s\S]*?\}\n    \}/;

const newMethod = `private String buildReminderPayload(Appointment appointment, String reminderType) {
        String customerName = appointment.getCustomer() != null && appointment.getCustomer().getFullName() != null
                ? appointment.getCustomer().getFullName()
                : "Cliente";
        String firstName = customerName.split(" ")[0];
        String serviceName = appointment.getService() != null && appointment.getService().getName() != null     
                ? appointment.getService().getName()
                : "Servicio";
        String appointmentTime = appointment.getAppointmentTime() != null
                ? appointment.getAppointmentTime().toString()
                : "hora por confirmar";
        if (appointmentTime.length() > 5) {
            appointmentTime = appointmentTime.substring(0, 5); // HH:mm format
        }
        String appointmentDateStr = appointment.getAppointmentDate() != null
                ? appointment.getAppointmentDate().toString()
                : "fecha por confirmar";
                
        // Convert YYYY-MM-DD to DD/MM/YYYY for UI consistency
        if (appointment.getAppointmentDate() != null) {
             java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
             appointmentDateStr = appointment.getAppointmentDate().format(formatter);
        }
        
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        if (appointment.getTotalPrice() != null && appointment.getTotalPrice().compareTo(java.math.BigDecimal.ZERO) > 0) {
            total = appointment.getTotalPrice();
        } else if (appointment.getService() != null) {
            total = appointment.getService().getPrice();
        }
        
        java.text.NumberFormat clpFormat = java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("es", "CL"));
        String totalPriceStr = clpFormat.format(total);

        // Fetch templates
        String titleTemplate = "2_HOUR".equalsIgnoreCase(reminderType) 
            ? appSettingsService.getNotificationTwoHourTitle() 
            : appSettingsService.getNotificationDefaultTitle();
            
        String bodyTemplate = "2_HOUR".equalsIgnoreCase(reminderType) 
            ? appSettingsService.getNotificationTwoHourBody() 
            : appSettingsService.getNotificationDefaultBody();
            
        // Calculate minutes until (approximation if 2_HOUR)
        long minutesUntil = 120;
        if (appointment.getAppointmentDate() != null && appointment.getAppointmentTime() != null) {
             java.time.LocalDateTime appointmentDateTime = java.time.LocalDateTime.of(appointment.getAppointmentDate(), appointment.getAppointmentTime());
             minutesUntil = java.time.Duration.between(java.time.LocalDateTime.now(), appointmentDateTime).toMinutes();
        }

        String finalTitle = titleTemplate
                .replace("{customerName}", customerName)
                .replace("{firstName}", firstName)
                .replace("{serviceName}", serviceName)
                .replace("{time}", appointmentTime)
                .replace("{date}", appointmentDateStr)
                .replace("{minutesUntil}", String.valueOf(minutesUntil))
                .replace("{hoursUntil}", String.valueOf(minutesUntil / 60))
                .replace("{totalPrice}", totalPriceStr)
                .replace("{businessName}", "BunnyCure");
                
        String finalBody = bodyTemplate
                .replace("{customerName}", customerName)
                .replace("{firstName}", firstName)
                .replace("{serviceName}", serviceName)
                .replace("{time}", appointmentTime)
                .replace("{date}", appointmentDateStr)
                .replace("{minutesUntil}", String.valueOf(minutesUntil))
                .replace("{hoursUntil}", String.valueOf(minutesUntil / 60))
                .replace("{totalPrice}", totalPriceStr)
                .replace("{businessName}", "BunnyCure");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", finalTitle);
        payload.put("body", finalBody);
        payload.put("icon", "/icon-192.png");
        payload.put("badge", "/icon-192.png");
        payload.put("tag", "appointment-" + appointment.getId());
        payload.put("requireInteraction", true);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("appointmentId", appointment.getId());
        data.put("customerName", customerName);
        data.put("serviceName", serviceName);
        data.put("appointmentDate", appointmentDateStr);
        data.put("appointmentTime", appointmentTime);
        data.put("reminderType", reminderType);
        data.put("url", "/calendar");
        payload.put("data", data);

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            log.warn("[WEB-PUSH] Error serializando payload, usando fallback");
            return "{\\"title\\":\\"Recordatorio\\",\\"body\\":\\"Tienes una cita próxima\\"}";
        }
    }`;

content = content.replace(methodRegex, newMethod);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Backend buildReminderPayload updated to use AppSettingsService templates');
