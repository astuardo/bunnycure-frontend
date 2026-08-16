const fs = require('fs');
const path = require('path');

const servicePath = path.resolve(__dirname, '../../bunnycure/src/main/java/cl/bunnycure/service/GiftCardService.java');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Normalize to LF first
const isCRLF = serviceContent.includes('\r\n');
let lfContent = serviceContent.replace(/\r\n/g, '\n');

// 1. In create method
const target1 = `.beneficiaryCustomer(beneficiary)
                .beneficiaryNameSnapshot(beneficiary.getFullName())
                .beneficiaryPhoneSnapshot(beneficiary.getPhone())
                .beneficiaryEmailSnapshot(normalizeNullable(request.getBeneficiaryEmail(), beneficiary.getEmail()))`;

const repl1 = `.beneficiaryCustomer(beneficiary)
                .beneficiaryNameSnapshot(beneficiary != null ? beneficiary.getFullName() : request.getBeneficiaryFullName().trim())
                .beneficiaryPhoneSnapshot(beneficiary != null ? beneficiary.getPhone() : request.getBeneficiaryPhone().trim())
                .beneficiaryEmailSnapshot(normalizeNullable(request.getBeneficiaryEmail(), beneficiary != null ? beneficiary.getEmail() : null))`;

// 2. In update method
const target2 = `giftCard.setBeneficiaryCustomer(beneficiary);
        giftCard.setBeneficiaryNameSnapshot(beneficiary.getFullName());
        giftCard.setBeneficiaryPhoneSnapshot(beneficiary.getPhone());
        giftCard.setBeneficiaryEmailSnapshot(normalizeNullable(request.getBeneficiaryEmail(), beneficiary.getEmail()));`;

const repl2 = `giftCard.setBeneficiaryCustomer(beneficiary);
        giftCard.setBeneficiaryNameSnapshot(beneficiary != null ? beneficiary.getFullName() : request.getBeneficiaryFullName().trim());
        giftCard.setBeneficiaryPhoneSnapshot(beneficiary != null ? beneficiary.getPhone() : request.getBeneficiaryPhone().trim());
        giftCard.setBeneficiaryEmailSnapshot(normalizeNullable(request.getBeneficiaryEmail(), beneficiary != null ? beneficiary.getEmail() : null));`;

// 3. findOrCreateBeneficiary
const target3 = `    private Customer findOrCreateBeneficiary(String fullName, String phone, String email) {
        return customerService.findByPhone(phone)
                .orElseGet(() -> createBeneficiaryWithOptionalEmailFallback(fullName, phone, email));
    }`;

const repl3 = `    private Customer findOrCreateBeneficiary(String fullName, String phone, String email) {
        if (phone == null || phone.isBlank() || phone.trim().equals("+56900000000")) {
            return null;
        }
        return customerService.findByPhone(phone.trim()).orElse(null);
    }`;

if (lfContent.includes(target1)) {
  lfContent = lfContent.replace(target1, repl1);
  console.log('1. Replaced create snapshots');
} else {
  console.error('Target 1 not found');
}

if (lfContent.includes(target2)) {
  lfContent = lfContent.replace(target2, repl2);
  console.log('2. Replaced update snapshots');
} else {
  console.error('Target 2 not found');
}

if (lfContent.includes(target3)) {
  lfContent = lfContent.replace(target3, repl3);
  console.log('3. Replaced findOrCreateBeneficiary');
} else {
  console.error('Target 3 not found');
}

if (isCRLF) {
  lfContent = lfContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync(servicePath, lfContent, 'utf8');
console.log('Updated GiftCardService.java successfully');
