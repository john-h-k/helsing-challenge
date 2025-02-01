import xml.etree.ElementTree as ET

# The provided XML data
xml_data = """
<rss xmlns:a10="http://www.w3.org/2005/Atom" version="2.0">
<channel xmlns:p4="#billsSchema">
<title>All Bills</title>
<link>https://bills.parliament.uk/</link>
<description>A list of up to 50 of most recent bills for the current session</description>
<copyright>Copyright 2025, Houses of Parliament</copyright>
<lastBuildDate>Sat, 01 Feb 2025 15:08:29 Z</lastBuildDate>
<a10:id>https://bills-api.parliament.uk/Rss/AllBill</a10:id>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3873</guid>
<link>https://bills.parliament.uk/bills/3873</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Finance Bill</title>
<description>A Bill to make provision about finance.</description>
<a10:updated>2025-01-31T19:59:52Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3879</guid>
<link>https://bills.parliament.uk/bills/3879</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Tobacco and Vapes Bill</title>
<description>A Bill to make provision about the supply of tobacco, vapes and other products, including provision prohibiting the sale of tobacco to people born on or after 1 January 2009 and provision about the licensing of retail sales and the registration of retailers; to enable product and information requirements to be imposed in connection with tobacco, vapes and other products; to control the advertising and promotion of tobacco, vapes and other products; and to make provision about smoke-free places, vape-free places and heated tobacco-free places.</description>
<a10:updated>2025-01-31T17:30:54Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3737</guid>
<link>https://bills.parliament.uk/bills/3737</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Employment Rights Bill</title>
<description>A Bill to make provision to amend the law relating to employment rights; to make provision about procedure for handling redundancies; to make provision about the treatment of workers involved in the supply of services under certain public contracts; to provide for duties to be imposed on employers in relation to equality; to provide for the establishment of the School Support Staff Negotiating Body and the Adult Social Care Negotiating Body; to amend the Seafarers’ Wages Act 2023; to make provision for the implementation of international agreements relating to maritime employment; to make provision about trade unions, industrial action, employers’ associations and the functions of the Certification Officer; to make provision about the enforcement of legislation relating to the labour market; and for connected purposes.</description>
<a10:updated>2025-01-31T17:24:44Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3755</guid>
<link>https://bills.parliament.uk/bills/3755</link>
<category>Government Bill</category>
<category>Commons</category>
<title>House of Lords (Hereditary Peers) Bill</title>
<description>A Bill to remove the remaining connection between hereditary peerage and membership of the House of Lords; to abolish the jurisdiction of the House of Lords in relation to claims to hereditary peerages; and for connected purposes.</description>
<a10:updated>2025-01-31T17:18:14Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3888</guid>
<link>https://bills.parliament.uk/bills/3888</link>
<category>Government Bill</category>
<category>Commons</category>
<title>National Insurance Contributions (Secondary Class 1 Contributions) Bill</title>
<description>A Bill to make provision about secondary Class 1 contributions.</description>
<a10:updated>2025-01-31T17:13:48Z</a10:updated>
</item>
<item p4:stage="3rd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3825</guid>
<link>https://bills.parliament.uk/bills/3825</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Data (Use and Access) Bill [HL]</title>
<description>A bill to make provision about access to customer data and business data; to make provision about services consisting of the use of information to ascertain and verify facts about individuals; to make provision about the recording and sharing, and keeping of registers, of information relating to apparatus in streets; to make provision about the keeping and maintenance of registers of births and deaths; to make provision for the regulation of the processing of information relating to identified or identifiable living individuals; to make provision about privacy and electronic communications; to establish the Information Commission; to make provision about information standards for health and social care; to make provision about the grant of smart meter communication licences; to make provision about the disclosure of information to improve public service delivery; to make provision about the retention of information by providers of internet services in connection with investigations into child deaths; to make provision about providing information for purposes related to the carrying out of independent research into online safety matters; to make provision about the retention of biometric data; to make provision about services for the provision of electronic signatures, electronic seals and other trust services; and for connected purposes.</description>
<a10:updated>2025-01-31T17:10:08Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3739</guid>
<link>https://bills.parliament.uk/bills/3739</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Crown Estate Bill [HL]</title>
<description>A Bill to amend the Crown Estate Act 1961.</description>
<a10:updated>2025-01-31T16:58:40Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3909</guid>
<link>https://bills.parliament.uk/bills/3909</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Children’s Wellbeing and Schools Bill</title>
<description>A Bill to make provision about the safeguarding and welfare of children; about support for children in care or leaving care; about regulation of care workers; about regulation of establishments and agencies under Part 2 of the Care Standards Act 2000; about employment of children; about breakfast club provision and school uniform; about attendance of children at school; about regulation of independent educational institutions; about inspections of schools and colleges; about teacher misconduct; about Academies and teachers at Academies; repealing section 128 of the Education Act 2002; about school places and admissions; about establishing new schools; and for connected purposes.</description>
<a10:updated>2025-01-31T16:53:39Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3768</guid>
<link>https://bills.parliament.uk/bills/3768</link>
<category>Private Members' Bill (Starting in the House of Lords)</category>
<category>Lords</category>
<title>Mortgage Prisoners Inquiry Bill [HL]</title>
<description>A Bill to establish an inquiry into the events surrounding the creation of mortgage prisoners, their consequences and any other relevant matters; and for connected purposes.</description>
<a10:updated>2025-01-31T16:48:47Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3887</guid>
<link>https://bills.parliament.uk/bills/3887</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Non-Domestic Rating (Multipliers and Private Schools) Bill</title>
<description>A Bill to make provision for, and in connection with, the introduction of higher non-domestic rating multipliers as regards large business hereditaments, and lower non-domestic rating multipliers as regards retail, hospitality and leisure hereditaments, in England and for the removal of charitable relief from non-domestic rates for private schools in England.</description>
<a10:updated>2025-01-31T16:46:23Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3738</guid>
<link>https://bills.parliament.uk/bills/3738</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Great British Energy Bill</title>
<description>A Bill to make provision about Great British Energy.</description>
<a10:updated>2025-01-31T16:43:29Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3774</guid>
<link>https://bills.parliament.uk/bills/3774</link>
<category>Private Members' Bill (Ballot Bill)</category>
<category>Commons</category>
<title>Terminally Ill Adults (End of Life) Bill</title>
<description>A Bill to allow adults who are terminally ill, subject to safeguards and protections, to request and be provided with assistance to end their own life; and for connected purposes.</description>
<a10:updated>2025-01-31T16:30:41Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3921</guid>
<link>https://bills.parliament.uk/bills/3921</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Public Authorities (Fraud, Error and Recovery) Bill</title>
<description>A Bill to make provision about the prevention of fraud against public authorities and the making of erroneous payments by public authorities; about the recovery of money paid by public authorities as a result of fraud or error; and for connected purposes.</description>
<a10:updated>2025-01-31T12:13:28Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3896</guid>
<link>https://bills.parliament.uk/bills/3896</link>
<category>Private Bill</category>
<category>Commons</category>
<title>City of London (Markets) Bill</title>
<description>A Bill to make provision for the repeal of legislation relating to Billingsgate Market and the London Central Markets; and for connected purposes.</description>
<a10:updated>2025-01-31T12:08:46Z</a10:updated>
</item>
<item p4:stage="Lords Special Public Bill Committee">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3766</guid>
<link>https://bills.parliament.uk/bills/3766</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Property (Digital Assets etc) Bill [HL]</title>
<description>A Bill to make provision about the types of things that are capable of being objects of personal property rights.</description>
<a10:updated>2025-01-31T09:15:57Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3884</guid>
<link>https://bills.parliament.uk/bills/3884</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Mental Health Bill [HL]</title>
<description>A Bill to make provision to amend the Mental Health Act 1983 in relation to mentally disordered persons; and for connected purposes.</description>
<a10:updated>2025-01-30T17:56:19Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3765</guid>
<link>https://bills.parliament.uk/bills/3765</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Terrorism (Protection of Premises) Bill</title>
<description>A Bill to require persons with control of certain premises or events to take steps to reduce the vulnerability of the premises or event to, and the risk of physical harm to individuals arising from, acts of terrorism; to confer related functions on the Security Industry Authority; to limit the disclosure of information about licensed premises that is likely to be useful to a person committing or preparing an act of terrorism; and for connected purposes.</description>
<a10:updated>2025-01-30T17:37:13Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3929</guid>
<link>https://bills.parliament.uk/bills/3929</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Border Security, Asylum and Immigration Bill</title>
<description>A Bill to make provision about border security; to make provision about immigration and asylum; to make provision about sharing customs data and trailer registration data; to make provision about articles for use in serious crime; to make provision about serious crime prevention orders; to make provision about fees paid in connection with the recognition, comparability or assessment of qualifications; and for connected purposes.</description>
<a10:updated>2025-01-30T17:09:37Z</a10:updated>
</item>
<item p4:stage="1st reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3381</guid>
<link>https://bills.parliament.uk/bills/3381</link>
<category>Private Bill</category>
<category>Lords</category>
<title>Royal Albert Hall Bill [HL]</title>
<description>A Bill to amend certain provisions of the Royal Albert Hall Act 1966 relating to the annual contribution payable by the Members of the Corporation towards the general purposes of the Royal Albert Hall; to make further provision regarding the exclusion of the Members from the hall; and to make provision for the sale of further seats and the exercise of certain rights in respect of Grand Tier boxes located on the first tier of the hall.</description>
<a10:updated>2025-01-30T13:43:17Z</a10:updated>
</item>
<item p4:stage="Committee of the whole House">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3733</guid>
<link>https://bills.parliament.uk/bills/3733</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Arbitration Bill [HL]</title>
<description>A Bill to amend the Arbitration Act 1996; and for connected purposes.</description>
<a10:updated>2025-01-30T11:08:51Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3930</guid>
<link>https://bills.parliament.uk/bills/3930</link>
<category>Private Members' Bill (under the Ten Minute Rule)</category>
<category>Commons</category>
<title>Pavement Parking Bill</title>
<description>A Bill to amend the law relating to parking on verges and footways in England outside of Greater London and in Wales.</description>
<a10:updated>2025-01-30T10:55:10Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3928</guid>
<link>https://bills.parliament.uk/bills/3928</link>
<category>Private Members' Bill (Starting in the House of Lords)</category>
<category>Lords</category>
<title>Ministry for Poverty Prevention Bill [HL]</title>
<description>A Bill to make provision for establishing a new government Ministry, the Ministry for Poverty Prevention; to make provision for the objectives and powers of that Ministry; to make provision that the Ministry can only be abolished or combined with another department by an Act of Parliament; to make provision for reporting requirements on the Ministry’s work; to make provision for a power to create binding poverty reduction targets; to make provision for a reporting system for all government spending in relation to poverty; and for connected purposes.</description>
<a10:updated>2025-01-30T09:04:45Z</a10:updated>
</item>
<item p4:stage="Consideration of Commons amendments">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3751</guid>
<link>https://bills.parliament.uk/bills/3751</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Water (Special Measures) Bill [HL]</title>
<description>A Bill to make provision about the regulation, governance and special administration of water companies.</description>
<a10:updated>2025-01-29T21:15:59Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3764</guid>
<link>https://bills.parliament.uk/bills/3764</link>
<category>Government Bill</category>
<category>Commons</category>
<title>Renters' Rights Bill</title>
<description>A Bill to make provision changing the law about rented homes, including provision abolishing fixed term assured tenancies and assured shorthold tenancies; imposing obligations on landlords and others in relation to rented homes and temporary and supported accommodation; and for connected purposes.</description>
<a10:updated>2025-01-29T17:31:58Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3772</guid>
<link>https://bills.parliament.uk/bills/3772</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Institute for Apprenticeships and Technical Education (Transfer of Functions etc) Bill [HL]</title>
<description>A bill to transfer the functions of the Institute for Apprenticeships and Technical Education, and its property, rights and liabilities, to the Secretary of State; to abolish the Institute; and to make amendments relating to the transferred functions.</description>
<a10:updated>2025-01-29T17:22:37Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3910</guid>
<link>https://bills.parliament.uk/bills/3910</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Bus Services (No. 2) Bill [HL]</title>
<description>A bill to make provision about local and school bus services; and for connected purposes.</description>
<a10:updated>2025-01-29T14:39:18Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3752</guid>
<link>https://bills.parliament.uk/bills/3752</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Product Regulation and Metrology Bill [HL]</title>
<description>A Bill to make provision about the marketing or use of products in the United Kingdom; about units of measurement and the quantities in which goods are marketed in the United Kingdom; and for connected purposes.</description>
<a10:updated>2025-01-29T14:38:02Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3927</guid>
<link>https://bills.parliament.uk/bills/3927</link>
<category>Private Members' Bill (under the Ten Minute Rule)</category>
<category>Commons</category>
<title>Women’s State Pension Age (Ombudsman Report and Compensation Scheme) Bill</title>
<description>A Bill to require the Secretary of State to publish measures to address the findings of the Parliamentary and Health Service Ombudsman in its report entitled “Women’s State Pension age: our findings on injustice and associated issues”; to require the Secretary of State to publish proposals for a compensation scheme for women born between 6 April 1950 and 5 April 1960 inclusive who have been affected by increases in the state pension age; and for connected purposes.</description>
<a10:updated>2025-01-29T10:04:10Z</a10:updated>
</item>
<item p4:stage="1st reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3895</guid>
<link>https://bills.parliament.uk/bills/3895</link>
<category>Private Bill</category>
<category>Lords</category>
<title>Norwich Livestock Market Bill [HL]</title>
<description>A Bill to make provision for the relocation of Norwich Livestock Market; and for connected purposes.</description>
<a10:updated>2025-01-28T20:28:26Z</a10:updated>
</item>
<item p4:stage="1st reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3897</guid>
<link>https://bills.parliament.uk/bills/3897</link>
<category>Private Bill</category>
<category>Lords</category>
<title>Malvern Hills Bill [HL]</title>
<description>A Bill to repeal and re-enact certain enactments relating to the Malvern Hills Conservators and the management of the Malvern Hills, to reconstitute and rename those Conservators as the Malvern Hills Trust and to confer further powers on the Malvern Hills Trust, to make further provision in relation to the Malvern Hills, and for other purposes.</description>
<a10:updated>2025-01-28T17:44:09Z</a10:updated>
</item>
<item p4:stage="Committee stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3734</guid>
<link>https://bills.parliament.uk/bills/3734</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Bank Resolution (Recapitalisation) Bill [HL]</title>
<description>A Bill to make provision about recapitalisation costs in relation to the special resolution regime under the Banking Act 2009.</description>
<a10:updated>2025-01-28T10:16:10Z</a10:updated>
</item>
<item p4:stage="Report stage">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3832</guid>
<link>https://bills.parliament.uk/bills/3832</link>
<category>Government Bill</category>
<category>Lords</category>
<title>Football Governance Bill [HL]</title>
<description>A bill to establish the Independent Football Regulator; to make provision for the licensing of football clubs; to make provision about the distribution of revenue received by organisers of football competitions; and for connected purposes.</description>
<a10:updated>2025-01-27T15:05:38Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3907</guid>
<link>https://bills.parliament.uk/bills/3907</link>
<category>Private Members' Bill (under the Ten Minute Rule)</category>
<category>Commons</category>
<title>Marriage (Prohibited Degrees of Relationship) Bill</title>
<description>A Bill to prohibit the marriage of first cousins; and for connected purposes.</description>
<a10:updated>2025-01-27T14:14:57Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3817</guid>
<link>https://bills.parliament.uk/bills/3817</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Covid-19 Vaccine Damage Bill</title>
<description>A Bill to require the Secretary of State to establish an independent review of disablement caused by Covid-19 vaccinations and the adequacy of the compensation offered to persons so disabled; and for connected purposes.</description>
<a10:updated>2025-01-27T14:12:18Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3891</guid>
<link>https://bills.parliament.uk/bills/3891</link>
<category>Private Members' Bill (under the Ten Minute Rule)</category>
<category>Commons</category>
<title>Terminal Illness (Relief of Pain) Bill</title>
<description>A Bill to require the Secretary of State to issue guidance about the application of the criminal law in respect of the administration of pain relief by healthcare professionals to people who are terminally ill; and for connected purposes.</description>
<a10:updated>2025-01-27T14:11:04Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3862</guid>
<link>https://bills.parliament.uk/bills/3862</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>NHS England (Alternative Treatment) Bill</title>
<description>A Bill to make provision about arranging alternative non-NHS England treatment for patients who have waited for more than one year for hospital treatment; and for connected purposes.</description>
<a10:updated>2025-01-27T14:01:49Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3850</guid>
<link>https://bills.parliament.uk/bills/3850</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Vaccine Damage Payments Act (Review) Bill</title>
<description>A Bill to place a duty on the Secretary of State to review, and publish a report on, the merits of increasing the relevant statutory sum under the Vaccine Damage Payments Act 1979 for all claims since 1 January 2020 by an amount representing the amount of inflation since 2007.</description>
<a10:updated>2025-01-27T13:59:51Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3786</guid>
<link>https://bills.parliament.uk/bills/3786</link>
<category>Private Members' Bill (Ballot Bill)</category>
<category>Commons</category>
<title>Unauthorised Entry to Football Matches Bill</title>
<description>A Bill to create an offence of unauthorised entry at football matches for which a football banning order can be imposed following conviction.</description>
<a10:updated>2025-01-27T13:58:52Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3868</guid>
<link>https://bills.parliament.uk/bills/3868</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Illegal Immigration (Offences) Bill</title>
<description>A Bill to create offences in respect of persons who have entered the UK illegally or who have remained in the UK without legal authority; and for connected purposes.</description>
<a10:updated>2025-01-27T13:56:48Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3863</guid>
<link>https://bills.parliament.uk/bills/3863</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>British Broadcasting Corporation (Privatisation) Bill</title>
<description>A Bill to make provision for the privatisation of the British Broadcasting Corporation; and for connected purposes.</description>
<a10:updated>2025-01-27T13:55:45Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3851</guid>
<link>https://bills.parliament.uk/bills/3851</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Highways Act 1980 (Amendment) Bill</title>
<description>A Bill to amend section 58 of the Highways Act 1980 to restrict the defences available to highway authorities; and for connected purposes.</description>
<a10:updated>2025-01-27T13:52:19Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3802</guid>
<link>https://bills.parliament.uk/bills/3802</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Pension (Special Rules for End of Life) Bill</title>
<description>A Bill to change the period of life expectancy relevant to certain pension rules.</description>
<a10:updated>2025-01-27T13:49:56Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3885</guid>
<link>https://bills.parliament.uk/bills/3885</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Child Criminal Exploitation (No. 2) Bill</title>
<description>A Bill to create an offence of child criminal exploitation; and for connected purposes.</description>
<a10:updated>2025-01-27T13:48:55Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3906</guid>
<link>https://bills.parliament.uk/bills/3906</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Rivers, Streams and Lakes (Protected Status) Bill</title>
<description>A Bill to make provision for the designation of rivers, streams and lakes as having protected status; to specify criteria for minimum standards that a site must meet where it has been designated as a river, stream or lake with protected status; to set minimum standards of water quality, safety, environmental management and provision of information in relation to such sites; and for connected purposes.</description>
<a10:updated>2025-01-27T13:47:44Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3913</guid>
<link>https://bills.parliament.uk/bills/3913</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Public Procurement (British Goods and Services) Bill</title>
<description>A Bill to make provision about public procurement in respect of British goods and services; and for connected purposes.</description>
<a10:updated>2025-01-27T13:46:54Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3900</guid>
<link>https://bills.parliament.uk/bills/3900</link>
<category>Private Members' Bill (under the Ten Minute Rule)</category>
<category>Commons</category>
<title>Elections (Proportional Representation) Bill</title>
<description>A Bill to introduce a system of proportional representation for parliamentary elections and for local government elections in England; and for connected purposes.</description>
<a10:updated>2025-01-27T13:45:56Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3796</guid>
<link>https://bills.parliament.uk/bills/3796</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Palestine Statehood (Recognition) (No. 2) Bill</title>
<description>A Bill to make provision in connection with the recognition of the State of Palestine.</description>
<a10:updated>2025-01-27T13:43:53Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3864</guid>
<link>https://bills.parliament.uk/bills/3864</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Children’s Clothing (Value Added Tax) Bill</title>
<description>A Bill to extend the definition of children’s clothing for the purposes of exemption from VAT; to extend the VAT exemption to further categories of school uniform; and for connected purposes.</description>
<a10:updated>2025-01-27T13:09:55Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3858</guid>
<link>https://bills.parliament.uk/bills/3858</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Anonymity of Suspects Bill</title>
<description>A Bill to create an offence of disclosing the identity of a person who is the subject of an investigation in respect of the alleged commission of an offence; and for connected purposes.</description>
<a10:updated>2025-01-27T13:06:55Z</a10:updated>
</item>
<item p4:stage="2nd reading">
<guid isPermaLink="true">https://bills.parliament.uk/bills/3852</guid>
<link>https://bills.parliament.uk/bills/3852</link>
<category>Private Members' Bill (Presentation Bill)</category>
<category>Commons</category>
<title>Covid-19 Vaccine Damage Payments Bill</title>
<description>A Bill to place a duty on the Secretary of State to make provision about financial assistance to persons who have suffered disablement following vaccination against Covid-19 and to the next of kin of persons who have died shortly after vaccination against Covid-19; to require the Secretary of State to report to Parliament on the merits of a no-fault compensation scheme to provide such financial assistance, on whether there should be any upper limit on the financial assistance available, on the criteria for eligibility and on whether payment should be made in all cases where there is no other reasonable cause for the death or disablement suffered; to provide for a special time limit under the Limitation Act 1980 for actions in respect of personal injury or death following a Covid-19 vaccination; and for connected purposes.</description>
<a10:updated>2025-01-27T13:05:49Z</a10:updated>
</item>
</channel>
</rss>
"""

# Parse the XML data
root = ET.fromstring(xml_data)

# Count all elements in the XML
element_count = sum(1 for _ in root.iter())

element_count
