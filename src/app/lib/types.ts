export type BusinessActor = {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  businessType: string;
  registrationNumber: string;
  createdAt: string;
  documentUrl?: string;
  documentName?: string;
};

export type ComplianceChecklist = {
  requirements: string[];
};