// lib/legal/agreements.ts
export type AgreementKind = "ENGAGEMENT" | "CONSENT_7216_USE" | "CONSENT_PAYMENT";

export const AGREEMENT_VERSION = "2025.1";

export const AGREEMENT_TITLES: Record<AgreementKind, string> = {
  ENGAGEMENT: "Engagement Letter",
  CONSENT_7216_USE: "Consent to Use of Tax Return Information",
  CONSENT_PAYMENT: "Consent for Payment",
};

export const AGREEMENT_TEXT: Record<AgreementKind, string> = {
  ENGAGEMENT: String.raw`Thank you for choosing SW TAX SERVICE, LLC to assist you with your 2025 taxes. This letter confirms the terms of our engagement with you and outlines the nature and extent of the services we will provide.

We will prepare your 2025 federal and state income tax returns. We will depend on you to provide the information we need to prepare complete and accurate returns. We may ask you to clarify some items but will not audit or otherwise verify the data you submit. An Organizer is enclosed to help you collect the data required for your return. The Organizer will help you avoid overlooking important information. By using it, you will contribute to the efficient preparation of your returns and help minimize the cost of our services.

We will perform accounting services only as needed to prepare your tax returns. Our work will not include procedures to find defalcations or other irregularities. Accordingly, our engagement should not be relied upon to disclose errors, fraud, or other illegal acts, though it may be necessary for you to clarify some of the information you submit. We will inform you of any material errors, fraud, or other illegal acts we discover.

The law imposes penalties when taxpayers underestimate their tax liability. Call us if you have concerns about such penalties.

Should we encounter instances of unclear tax law, or of potential conflicts in the interpretation of the law, we will outline the reasonable courses of action and the risks and consequences of each. We will ultimately adopt, on your behalf, the alternative you select.

Please be advised that if you receive any correspondence from a taxing authority that pertains to a tax return prepared by this firm we will be happy to address this matter on your behalf. Included in the cost of your tax preparation is 120 minutes of correspondence work per tax year at no additional charge. During that 120 minutes we will assess your situation and apprise you of the course of action we believe is best to take. If we can also compose and send off a reply to the appropriate taxing authority then we will certainly do so. If the matter or issue will involve more than 120 minutes of work, each additional hour (or fraction thereof) will be billed at a standard hourly rate of one hundred and fifty dollars ($150) per 60 minute hour. When possible, we will do our best to inform you if we believe your issue will require more than 120 minutes to handle, however there may be a situation when we are unable to inform you in advance. Even if we are unable to inform you, the standard hourly rate listed above will apply and is payable upon completion of this work. At any time in the process you may choose to have us cease our work in connection with your correspondence but we will require said request in writing with your name and signature included. If, during the course of this work, it becomes apparent the correspondence received was due to an error or omission by this office there will be no charge for handling the correspondence regardless of the time involved. Please note that except in cases where our office is deemed at fault, a flat $50 dollar handling charge will be assessed for all matters where our assistance is requested in handling any such correspondence from any taxing authority. This charge is not included in your annual tax preparation fees and is payable upon completion of our work in connection with said correspondence.

Please also note that audit/examination representation work is not included in the tax preparation fee and is considered a different engagement with a separate fee structure. If you have any questions regarding the specifics of audit/examination representation please feel free to ask any time before, during or after your appointment. Again if your returns are audited or examined by any taxing authority, for any reason, the fee you paid for their preparation does not include the costs to represent you with regard to any audit or examination unless you opt in for the Audit Maintenance Protection for $49.99 which will be added in with your tax preparation fees.

Our fee is based on the time required at standard billing rates plus out-of-pocket expenses. Invoices are due and payable upon presentation. All accounts not paid within thirty (30) days are subject to interest charges to the extent permitted by state law.

We will return your original records to you at the end of this engagement. Store these records, along with all supporting documents, in a secure location. We retain copies of your records and our work papers from your engagement for up to seven years, after which these documents will be destroyed.

If you have not selected to e-file your returns with our office, you will be solely responsible to file the returns with the appropriate taxing authorities. Review all tax-return documents carefully before signing them. Our engagement to prepare your 2025 tax returns will conclude with the delivery of the completed returns to you, or with e-filed returns, with your signature and our subsequent submittal of your tax return.

To affirm that this letter correctly summarizes your understanding of the arrangements for this work, sign the enclosed copy of this letter in the space indicated and return it to us in the envelope provided.

Thank you for the opportunity to be of service. If you have any questions, contact our office at (470)423-5954.

Warm Regards,

Sumeco Wynn
CEO
SW Tax Service, LLC
info@swtaxsvc.com`,

  CONSENT_7216_USE: String.raw`Federal law requires this consent form be provided to you. Unless authorized by law, we cannot use, without your consent, your tax return information for purposes other than the preparation and filing of your tax return. However, federal law also prohibits us from revealing any personal or financial information to any third party. Therefore as a matter of fact, we will never reveal your financial or personal information in any way, to anyone, unless you specifically request we do so, and provide in writing to us the specific person or persons to whom you wish that disclose to be made, which is done on a wholly separate consent form from this.

For the purposes of this consent form please note we are seeking consent only to satisfy requirements set forth by federal law so we may speak with you on the phone, send you email correspondences of any kind, send you mailings, newsletters, email reminders, holiday and occasional cards and greetings, and reminders of upcoming deadlines, etc.

You are not required to complete this form. If we obtain your signature on this form by conditioning our service on your consent, your consent will not be valid. Your consent is valid for the amount of time that you specify. If you do not specify the duration of your consent, your consent is valid for a period of three years from the date you have signed the consent.

The undersigned hereby consents to the use; by SW Tax Service LLC, its owner, employees, and staff; of any and all tax return information pertaining to:

- Direct questions, inquiries or requests you make regarding your tax returns, situation, or issues.
- Requests you make for copies of your documents, figures, numbers, or information.
- Upon your direct request in order to connect you with another professional in another field or profession so you may gain further information on a certain topic not available or in the realm of expertise of this firm.
- Notification of important tax law changes.
- Notification of changes or information that will impact our engagement, such as a change of firm website address, email address, physical location, or other such contact, biographical or geographical information.
- Other reasonable business purposes including but not limited to: appointment reminders, holiday mailings, birthday greetings and other informational mailings.

The tax information may not be disclosed or used by SW Tax Service LLC, its owner, employees, or staff, for any purpose other than that which is permitted by this consent document.

If you believe your tax return information has been disclosed or used improperly in a manner unauthorized by law or without your permission, you may contact the Treasury Inspector General for Tax Administration (TIGTA) by telephone at 1-800-366-4484 or by email at complaints@tigta.treas.gov.`,

  CONSENT_PAYMENT: String.raw`We here at SW Tax Service, LLC value the relationship we have with all of our clients. We are in the business to provide you with the absolute best service you can have. With saying that, we would like to remind you that we are providing you a service NOT a refund. You as a taxpayer have the choice to pay your tax preparation fees by one of the following: cash, check, money order, credit card, or directly from your refund*.

*If you choose to have the tax preparation fees taken from your refund and for whatever reason your taxes are intercepted, YOU ARE STILL RESPONSIBLE FOR THE TAX PREPARATION FEES! Please contact us immediately at our office for payment or payment arrangements. By signing your return you are agreeing to pay the preparation fees regardless if your refund was received or not. After 90 days from the date the refund was scheduled to arrive if no payment or payment arrangement is made, we will be forced to put your account into collections and/or debit your bank account. We hope we never have to go this route, so please keep open communication with us so we can work with you!`,
};
