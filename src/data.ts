export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  category: 'Existing' | 'Recommended Action';
  completed: boolean;
}

export const initialDocuments: DocumentItem[] = [
  {
    id: '1',
    title: 'High School & College Records',
    description: 'Demonstrates baseline educational standing and competence.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '2',
    title: 'Union Construction Certifications',
    description: 'Apprenticeship program completion showing dedication and hard work.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '3',
    title: 'SC2 Performance Evaluations',
    description: 'Stellar evaluations from HR/Tech/Logistics demonstrating professional capability and responsibility.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '4',
    title: 'Tax Returns & Bank Statements',
    description: 'Critical proof that you lived off savings and legitimate income, directly contradicting any assumptions of being a drug dealer.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '5',
    title: 'House Deed & Mortgage Docs',
    description: 'Proves ties to the community (Tazewell County) and established residency/financial responsibility.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '6',
    title: 'Midwest Academy / Ben Trane Context',
    description: 'Validation of the extreme trauma experienced in the troubled teen industry to explain PTSD triggers.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '7',
    title: 'AI Development Proof',
    description: 'Printouts of technical work demonstrating current business endeavors and future societal contribution.',
    category: 'Existing',
    completed: false,
  },
  {
    id: '8',
    title: 'Character Letters',
    description: 'Letters from friends, former SC2 coworkers, or mentors vouching for your character and confirming you are not a distributor.',
    category: 'Recommended Action',
    completed: false,
  },
  {
    id: '9',
    title: 'Medical Records (Prior Rx)',
    description: 'Records proving your previous 55mg Adderall prescription and the abrupt discharge. This validates the subsequent executive dysfunction.',
    category: 'Recommended Action',
    completed: false,
  },
  {
    id: '10',
    title: 'Proof of Mental Health Intake',
    description: 'CRITICAL: Do not just tell the judge you want help. Schedule an intake appointment before the hearing and bring the confirmation document.',
    category: 'Recommended Action',
    completed: false,
  },
];

export const letterToJudge = `Honorable Judge [Judge's Last Name],

I stand before you having entered an open plea regarding my drug possession charges. I take full responsibility for the decisions that brought me to this courtroom. I am writing to you today not to make excuses for my actions, but to provide essential context regarding my background, my state of mind at the time of the arrest, and to respectfully ask for the opportunity to rebuild my life under the strict supervision of probation. 

For years following a period of incarceration in 2016, I worked tirelessly to establish a stable, productive life. I was employed at SC2 (Supply Chain/Logistics) for over four years, quickly rising to Crew Lead, then Supervisor, and eventually handling complex Human Resources and Tech Support duties. I then joined Local 231 Pekin Laborers Union, working in the structural construction division. Through hard work, I purchased a home in Tazewell County, fully titled in my name, where I established deep roots and financial responsibilities. I was a functioning, contributing member of this community.

In April 2025, my absolute stability was shattered by a localized crisis. I endured a devastating divorce, which was compounded when my home was subjected to a coordinated, deeply traumatic burglary. My sanctuary was invaded, my support system evaporated overnight, and I was left in a state of hyper-vigilant terror. 

This trauma triggered severe, latent PTSD stemming from profound institutional abuse I survived as a teenager at the Midwest Academy—a trauma facility later raided by the FBI. To make matters worse, during this exact period of acute crisis, a misunderstanding with my psychiatric provider led to the abrupt termination of the ADHD medication I had relied on almost daily since I was seven years old. 

Without my medication, and crippled by the trauma of the home invasion, I experienced a total collapse of executive function and an overwhelming panic response. Out of sheer desperation to stop the psychological bleeding, I made the terrible decision to attempt to self-medicate my PTSD and suicidal ideation using Ketamine and MDMA. 

Because of my background in logistics and supply chain management, my approach to these substances was highly regimented. I purchased them in bulk purely for cost efficiency, and obsessively portioned them into meticulously measured doses for harm reduction in my personal usage. The packaging and specific needles found in my possession were exclusively intended for precise, intramuscular trauma self-medication—mirroring clinical therapeutic settings—not for distribution or sale. My enclosed bank statements and tax returns will confirm that I have never lived the lifestyle of a drug dealer; I was a desperate man depleting his savings to survive a mental health crisis.

Sending me to prison would permanently destroy the home I have worked so hard to buy, sever the connection to my service dogs, and irreparably shatter the business I am currently trying to launch in the AI technology sector. I am terrified of losing everything I have fought to build.

I am asking for your grace. I am completely willing to comply with mandatory drug testing, rigorous probation requirements, and intensive psychiatric treatment. I want to heal legally and safely. Please allow me the opportunity to remain in society so I can correct my mistakes, receive the professional help I desperately need, and return to being the productive, law-abiding citizen I know I can be.

Respectfully,

[Your Name]`;

export const hearingSpeech = `Your honor, thank you for granting me the opportunity to speak.

I want to start by apologizing to the Court, and taking full responsibility for the position I am in today. 

I am not a career criminal, and I am not a drug dealer. Before April of 2025, I was a homeowner, a supervisor at my logistics company, a union laborer, and a man trying to build a technology startup. 

When my marriage collapsed and my home was burglarized shortly after, I lost my entire support system and my sense of safety. Paired with the abrupt loss of the psychiatric medication I had taken since I was seven years old, my executive function totally collapsed. The trauma broke me, and in a state of absolute desperation, I made the terrible mistake of trying to self-medicate my PTSD rather than seeking professional help. 

I am terrified of losing my home, my dogs, and the future of my business. Going to prison would destroy the foundation I have spent the last decade building. 

I don't expect a free pass. I am asking for supervision. I am asking for probation and the mandate to get the professional psychiatric help I so clearly need, and which I am ready to embrace. I will comply with every drug test and every requirement this Court sets. 

Please give me the chance to prove that I am a man worth keeping in society. Thank you for your time.`;
