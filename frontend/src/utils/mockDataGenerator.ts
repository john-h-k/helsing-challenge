import {
    Decision,
    Effect,
    Event,
    GeoObject,
    ObjectType,
    PotentialEvent,
} from "../types/Event"
import { addDays, subDays } from "date-fns"
import { streamJson } from "./stream"

const generateRandomCoordinate = () => {
    return Math.random() * 360 - 180
}

const generatePotentialEvent = (): PotentialEvent => {
    return {
        id: Math.random().toString(36).substr(2, 9),
        title: `Potential Impact ${Math.floor(Math.random() * 100)}`,
        probability: Math.random(),
        impact: Math.random(),
        description: `This could lead to ${["economic", "social", "political"][Math.floor(Math.random() * 3)]
            } consequences`,
    }
}

const generateEffect = (order: number, parentEffect?: string): Effect => {
    const name = `Effect_${Math.random().toString(36).substr(2, 6)}`
    return {
        name,
        order,
        parent: order === 1 ? "root" : [parentEffect || "root"],
        description: `This effect could lead to ${["economic", "social", "political"][Math.floor(Math.random() * 3)]
            } changes`,
        p_given_parent: {
            [order === 1 ? "root" : parentEffect || "root"]: Math.random(),
        },
    }
}

const generateDecision = (): Decision => {
    // Generate a chain of effects
    const firstOrderEffect = generateEffect(1)
    const secondOrderEffect = generateEffect(2, firstOrderEffect.name)
    const thirdOrderEffect = generateEffect(3, secondOrderEffect.name)

    return {
        id: Math.random().toString(36).substr(2, 9),
        title: `Strategic Decision ${Math.floor(Math.random() * 100)}`,
        description: `This decision involves ${["diplomatic", "military", "economic"][Math.floor(Math.random() * 3)]
            } action`,
        effects: [firstOrderEffect, secondOrderEffect, thirdOrderEffect],
    }
}

// Replace the old OBJECT_TYPES with the new Amazon-specific types
const OBJECT_TYPES: string[] = [
    "economic", // For fulfillment centers, retail stores
    "infrastructure", // For AWS, data centers, offices
    "facility", // For research labs, engineering offices
]

const COUNTRIES = [
    "USA",
    "China",
    "Russia",
    "Germany",
    "France",
    "UK",
    "Japan",
    "India",
]
const OBJECT_NAMES = [
    "Power Plant Alpha",
    "Military Base Beta",
    "Port Facility Gamma",
    "Research Center Delta",
    "Industrial Complex Epsilon",
    "Communication Hub Zeta",
    "Transportation Node Eta",
    "Resource Facility Theta",
]

const generateGeoObject = (nearLocation?: {
    lat: number
    lng: number
}): GeoObject => {
    const latitude = nearLocation
        ? nearLocation.lat + (Math.random() - 0.5) * 10
        : Math.random() * 140 - 70
    const longitude = nearLocation
        ? nearLocation.lng + (Math.random() - 0.5) * 10
        : Math.random() * 360 - 180

    return {
        id: Math.random().toString(36).substr(2, 9),
        name: OBJECT_NAMES[Math.floor(Math.random() * OBJECT_NAMES.length)],
        type: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
        description: `Strategic ${OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)]
            } facility`,
        latitude,
        longitude,
        countries: Array(Math.floor(Math.random() * 2) + 1)
            .fill(null)
            .map(() => COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]),
        status: ["active", "inactive", "unknown"][Math.floor(Math.random() * 3)] as
            | "active"
            | "inactive"
            | "unknown",
    }
}

const EVENT_TITLES = [
    "Political Unrest",
    "Economic Summit",
    "Natural Disaster",
    "Technological Breakthrough",
    "Diplomatic Meeting",
    "Security Incident",
    "Trade Agreement",
    "Environmental Crisis",
]

const EVENT_DESCRIPTIONS = [
    "Major development with global implications",
    "Significant event affecting regional stability",
    "Critical situation requiring immediate attention",
    "Strategic occurrence with long-term impact",
    "Emerging situation with potential escalation",
]

const generateRandomEvent = (index: number): Event => {
    const latitude = Math.random() * 140 - 70 + Math.random() * 0.1 // Avoid poles
    const longitude = Math.random() * 360 - 180

    return {
        id: Math.random().toString(36).substr(2, 9),
        title: EVENT_TITLES[Math.floor(Math.random() * EVENT_TITLES.length)],
        description:
            EVENT_DESCRIPTIONS[Math.floor(Math.random() * EVENT_DESCRIPTIONS.length)],
        latitude,
        longitude,
        date: addDays(subDays(new Date(), 30), index),
        severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as
            | "low"
            | "medium"
            | "high",
        potentialEvents: Array(Math.floor(Math.random() * 3) + 1)
            .fill(null)
            .map(() => generatePotentialEvent()),
        source: `Source ${Math.floor(Math.random() * 100)}`,
        location: `${["Asia", "Europe", "Americas", "Africa"][Math.floor(Math.random() * 4)]
            }`,
        decisions: Array(Math.floor(Math.random() * 3) + 2)
            .fill(null)
            .map(generateDecision),
        objects: Array(Math.floor(Math.random() * 3) + 1)
            .fill(null)
            .map(() => generateGeoObject({ lat: latitude, lng: longitude })),
    }
}

// Remove unused military and political from the type mapping since we don't use them
const INFRA_TYPE_MAPPING: { [key: string]: ObjectType } = {
    research_lab: "facility",
    corporate_office: "infrastructure",
    data_center: "infrastructure",
    fulfillment_center: "economic",
    delivery_hub: "economic",
    engineering_office: "facility",
    retail_store: "economic",
    sustainability_site: "infrastructure",
}

export async function* getRealEvents(
    companyContext: string,
    count: number
): AsyncIterator<Event> {
  companyContext =
    "Arrow Electronics is a global technology solutions provider specializing in electronic components distribution, enterprise computing solutions, and engineering services. The company supplies semiconductors, connectors, resistors, capacitors, microcontrollers, sensors, power solutions, and networking products. It also offers IT solutions, cloud computing, cybersecurity, AI, and IoT integration services. Arrow serves industries such as aerospace, automotive, industrial, healthcare, and consumer electronics. Arrow Electronics operates globally through various subsidiaries specializing in electronic components and computing solutions. Notable subsidiaries include Arrow Electronics (UK) Ltd., Arrow ECS GmbH (Germany), Arrow Electronics Canada Ltd., and Arrow ECS France SAS, each focusing on distribution and enterprise solutions in their respective regions. They have also recently began expanding into AI services.";
  let body = {
    company_context: companyContext,
    // country_codes: ["CN", "GB"],
    country_codes: ["MAGIC", "GB", "SG", "US", "IN"],
    query: "Arrow Electronics is expanding its businesses into AI services and is concerned about regulatory risks here. It is also concerned about tarrif and regulatory risks with it's traditional IT distribution businesses.",
    max_events: 12
  }

    let res = await fetch("http://localhost:8080/stream_relevant_events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })

    for await (const e of streamJson(res)) {
        // Convert infrastructure objects to GeoObject format
        const objects: GeoObject[] = e.infra
            ? e.infra.map((inf: any) => ({
                id: inf.id,
                name: inf.name,
                type: INFRA_TYPE_MAPPING[inf.type] || "facility", // Default to facility if type not found
                description: inf.description,
                latitude: inf.latitude,
                longitude: inf.longitude,
                countries: Array.isArray(inf.countries)
                    ? inf.countries
                    : [inf.countries],
                status: inf.status as "active" | "inactive" | "unknown",
            }))
            : []

        yield {
            id: e.id,
            title: e.event_name,
            description: e.blurb,
            latitude: e.lat,
            possibility: e.possibility,
            reasoning: e.reasoning,
            location: e.location,
            type: e.type,
            questions: [],
            longitude: e.lon,
            date: e.date ? new Date(e.date) : new Date(),
            severity: "high",
            objects: objects, // Use the converted infrastructure objects
        }
    }
}

export async function* generateMockEvents(
    count: number
): AsyncGenerator<Event> {
    // Simulate async delay (e.g., mimicking API call)
    for (let i = 0; i < count; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))

        yield {
            id: String(i),
            title: `Event ${i}`,
            description: `This is the description for event ${i}.`,
            date: addDays(subDays(new Date(), 30), i), // Added date property
            severity: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
            possibility: Math.random() > 0.7 ? true : false,
            latitude: (Math.random() - 0.5) * 180,
            longitude: (Math.random() - 0.5) * 360,
            source: "system",
            location: "Country Name",
            objects: [],
            decisions: [],
            questions: [],  // Add missing questions array
            type: "mock"    // Add missing type field
        }
    }
}
