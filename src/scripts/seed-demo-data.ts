import { supabaseAdmin } from '@/lib/supabase-server'
import { createService } from '@/lib/db/services'

// Script to create demo data for testing the dashboard
export async function seedDemoData() {
  try {
    console.log('🌱 Starting demo data seeding...')

    // Create demo services for existing businesses
    const { data: businesses, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .limit(5)

    if (businessError) {
      console.error('Error fetching businesses:', businessError)
      return
    }

    if (!businesses || businesses.length === 0) {
      console.log('No businesses found. Create a business first!')
      return
    }

    console.log(`Found ${businesses.length} businesses`)

    for (const business of businesses) {
      console.log(`Adding services for ${business.business_name}...`)

      // Sample services based on business type
      const sampleServices = [
        { name: 'Haircut & Style', description: 'Professional haircut with styling', price: 45.00, duration_minutes: 60 },
        { name: 'Hair Wash & Blow Dry', description: 'Shampoo, conditioning, and blow dry', price: 25.00, duration_minutes: 30 },
        { name: 'Hair Color', description: 'Full hair coloring service', price: 85.00, duration_minutes: 120 },
        { name: 'Beard Trim', description: 'Professional beard trimming and styling', price: 20.00, duration_minutes: 20 },
        { name: 'Hair Treatment', description: 'Deep conditioning hair treatment', price: 35.00, duration_minutes: 45 }
      ]

      // Add 3-5 random services per business
      const numberOfServices = Math.floor(Math.random() * 3) + 3
      const selectedServices = sampleServices.slice(0, numberOfServices)

      for (const service of selectedServices) {
        try {
          await createService({
            business_id: business.id,
            ...service
          })
          console.log(`  ✅ Created service: ${service.name}`)
        } catch {
          console.log(`  ⚠️  Service ${service.name} might already exist`)
        }
      }

      // Create some demo clients
      console.log(`Creating demo clients for ${business.business_name}...`)

      const demoClients = [
        { first_name: 'Maria', last_name: 'Garcia', phone: '+1234567890' },
        { first_name: 'Ana', last_name: 'Martinez', phone: '+1234567891' },
        { first_name: 'Sofia', last_name: 'Rodriguez', phone: '+1234567892' },
        { first_name: 'Carlos', last_name: 'Lopez', phone: '+1234567893' },
        { first_name: 'Luis', last_name: 'Hernandez', phone: '+1234567894' }
      ]

      for (const clientData of demoClients) {
        try {
          // Create user
          const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
              role: 'final_client',
              ...clientData
            })
            .select()
            .single()

          if (userError) {
            console.log(`  ⚠️  Client ${clientData.first_name} might already exist`)
            continue
          }

          // Create client-business relationship
          await supabaseAdmin
            .from('client_businesses')
            .insert({
              client_id: user.id,
              business_id: business.id,
              token_used: 'demo-token' // Placeholder for demo
            })

          console.log(`  ✅ Created client: ${clientData.first_name} ${clientData.last_name}`)
        } catch (error) {
          console.log(`  ⚠️  Error creating client ${clientData.first_name}:`, error)
        }
      }

      // Create some demo appointments
      console.log(`Creating demo appointments for ${business.business_name}...`)

      // Get services and clients for this business
      const { data: services } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('business_id', business.id)

      const { data: clientRelations } = await supabaseAdmin
        .from('client_businesses')
        .select('client_id')
        .eq('business_id', business.id)

      if (services && services.length > 0 && clientRelations && clientRelations.length > 0) {
        // Create appointments for today and future dates
        const today = new Date()
        const dates = [
          today.toISOString().split('T')[0], // Today
          new Date(today.getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
          new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0] // Day after tomorrow
        ]

        const times = ['09:00', '10:30', '12:00', '14:30', '16:00']
        const statuses = ['pending', 'confirmed', 'completed']

        for (let i = 0; i < 8; i++) {
          const randomService = services[Math.floor(Math.random() * services.length)]
          const randomClient = clientRelations[Math.floor(Math.random() * clientRelations.length)]
          const randomDate = dates[Math.floor(Math.random() * dates.length)]
          const randomTime = times[Math.floor(Math.random() * times.length)]
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

          try {
            await supabaseAdmin
              .from('appointments')
              .insert({
                business_id: business.id,
                client_id: randomClient.client_id,
                service_id: randomService.id,
                appointment_date: randomDate,
                appointment_time: randomTime,
                status: randomStatus,
                notes: 'Demo appointment'
              })

            console.log(`  ✅ Created appointment: ${randomDate} at ${randomTime}`)
          } catch (error) {
            console.log(`  ⚠️  Error creating appointment:`, error)
          }
        }
      }

      console.log(`✅ Completed demo data for ${business.business_name}\n`)
    }

    console.log('🎉 Demo data seeding completed!')

  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoData()
}