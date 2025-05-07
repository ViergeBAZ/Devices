export interface IAdvisor {
  /* required fields */
  id: string
  name: string
  firstLastName: string
  secondLastName: string
  phone: string
  email: string
  address: string
  exteriorNumber: string
  interiorNumber?: string
  zipCode: string
  state: string
  town: string
  suburb: string
  addressReference?: string
  betweenAddress?: string
  /* documents */
  ineFront?: string
  ineBack?: string
  proofOFAddress?: string
  /* defaults */
  createdAt?: Date
  updatedAt?: Date
  active?: boolean
}
