import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Verify QuickBooks webhook signature
 * https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks#verify-the-payload
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookToken: string
): boolean {
  const hash = crypto
    .createHmac('sha256', webhookToken)
    .update(payload)
    .digest('base64')

  return hash === signature
}

/**
 * QuickBooks Webhook Handler
 * Receives real-time events from QuickBooks Online
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const signature = request.headers.get('intuit-signature')
    const body = await request.text()

    // Verify webhook signature
    if (signature) {
      const webhookToken = process.env.INTUIT_WEBHOOK_TOKEN || ''
      if (!verifyWebhookSignature(body, signature, webhookToken)) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const payload = JSON.parse(body)

    console.log('📥 QuickBooks Webhook Received:', {
      realmId: payload.eventNotifications?.[0]?.realmId,
      entities: payload.eventNotifications?.[0]?.dataChangeEvent?.entities?.length
    })

    // Store webhook events
    if (payload.eventNotifications && Array.isArray(payload.eventNotifications)) {
      for (const notification of payload.eventNotifications) {
        const realmId = notification.realmId
        const entities = notification.dataChangeEvent?.entities || []

        for (const entity of entities) {
          // Store each entity change event
          await supabase
            .from('quickbooks_webhooks')
            .insert({
              realm_id: realmId,
              event_name: entity.name,
              entity_name: entity.name,
              entity_id: entity.id,
              operation: entity.operation,
              payload: entity,
              processed: false
            })

          console.log(`✅ Stored webhook: ${entity.operation} ${entity.name} (ID: ${entity.id})`)

          // Trigger immediate sync for critical entities
          if (['Customer', 'Invoice', 'Payment'].includes(entity.name)) {
            await processWebhookEvent(realmId, entity)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error: any) {
    console.error('❌ QuickBooks Webhook Error:', error)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * Process webhook event immediately
 */
async function processWebhookEvent(realmId: string, entity: any) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const operation = entity.operation // Create, Update, Delete, Merge
    const entityName = entity.name // Customer, Invoice, Payment, etc.
    const entityId = entity.id

    console.log(`🔄 Processing ${operation} on ${entityName} (ID: ${entityId})`)

    // Get QuickBooks access token
    const { data: tokens } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .eq('realm_id', realmId)
      .single()

    if (!tokens) {
      console.error('No tokens found for realm:', realmId)
      return
    }

    // Fetch updated entity from QuickBooks API
    const qbData = await fetchEntityFromQuickBooks(
      tokens.access_token,
      realmId,
      entityName,
      entityId
    )

    if (!qbData) {
      console.error('Failed to fetch entity from QuickBooks')
      return
    }

    // Update local database based on entity type
    switch (entityName) {
      case 'Customer':
        await syncCustomer(qbData)
        break
      case 'Invoice':
        await syncInvoice(qbData)
        break
      case 'Payment':
        await syncPayment(qbData)
        break
      case 'Account':
        await syncAccount(qbData)
        break
      case 'Vendor':
        await syncVendor(qbData)
        break
    }

    // Mark webhook as processed
    await supabase
      .from('quickbooks_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('entity_id', entityId)
      .eq('operation', operation)

    console.log(`✅ Processed ${entityName} ${entityId}`)

  } catch (error: any) {
    console.error('Error processing webhook event:', error)

    // Log error in database
    await supabase
      .from('quickbooks_webhooks')
      .update({
        error_message: error.message
      })
      .eq('entity_id', entity.id)
      .eq('operation', entity.operation)
  }
}

/**
 * Fetch entity from QuickBooks API
 */
async function fetchEntityFromQuickBooks(
  accessToken: string,
  realmId: string,
  entityName: string,
  entityId: string
) {
  try {
    const endpoint = process.env.INTUIT_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'

    const response = await fetch(
      `${endpoint}/v3/company/${realmId}/${entityName.toLowerCase()}/${entityId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`QuickBooks API error: ${response.status}`)
    }

    const data = await response.json()
    return data[entityName]

  } catch (error) {
    console.error('Error fetching from QuickBooks:', error)
    return null
  }
}

/**
 * Sync customer to database
 */
async function syncCustomer(customer: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quickbooks_customers')
    .upsert({
      qb_id: customer.Id,
      display_name: customer.DisplayName,
      given_name: customer.GivenName,
      family_name: customer.FamilyName,
      company_name: customer.CompanyName,
      email: customer.PrimaryEmailAddr?.Address,
      phone: customer.PrimaryPhone?.FreeFormNumber,
      mobile: customer.Mobile?.FreeFormNumber,
      billing_address: customer.BillAddr,
      shipping_address: customer.ShipAddr,
      balance: parseFloat(customer.Balance || '0'),
      taxable: customer.Taxable || false,
      active: customer.Active !== false,
      sync_token: customer.SyncToken,
      metadata: customer,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'qb_id'
    })
}

/**
 * Sync invoice to database
 */
async function syncInvoice(invoice: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quickbooks_invoices')
    .upsert({
      qb_id: invoice.Id,
      customer_qb_id: invoice.CustomerRef?.value,
      doc_number: invoice.DocNumber,
      txn_date: invoice.TxnDate,
      due_date: invoice.DueDate,
      total_amount: parseFloat(invoice.TotalAmt || '0'),
      balance: parseFloat(invoice.Balance || '0'),
      currency_code: invoice.CurrencyRef?.value || 'CAD',
      status: getInvoiceStatus(invoice),
      email_status: invoice.EmailStatus,
      line_items: invoice.Line,
      metadata: invoice,
      sync_token: invoice.SyncToken,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'qb_id'
    })
}

/**
 * Sync payment to database
 */
async function syncPayment(payment: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quickbooks_payments')
    .upsert({
      qb_id: payment.Id,
      customer_qb_id: payment.CustomerRef?.value,
      txn_date: payment.TxnDate,
      total_amount: parseFloat(payment.TotalAmt || '0'),
      currency_code: payment.CurrencyRef?.value || 'CAD',
      payment_method: payment.PaymentMethodRef?.name,
      payment_ref_number: payment.PaymentRefNum,
      deposit_to_account_id: payment.DepositToAccountRef?.value,
      line_items: payment.Line,
      metadata: payment,
      sync_token: payment.SyncToken,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'qb_id'
    })
}

/**
 * Sync account to database
 */
async function syncAccount(account: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quickbooks_accounts')
    .upsert({
      qb_id: account.Id,
      name: account.Name,
      account_type: account.AccountType,
      account_sub_type: account.AccountSubType,
      classification: account.Classification,
      current_balance: parseFloat(account.CurrentBalance || '0'),
      active: account.Active !== false,
      description: account.Description,
      metadata: account,
      sync_token: account.SyncToken,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'qb_id'
    })
}

/**
 * Sync vendor to database
 */
async function syncVendor(vendor: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from('quickbooks_vendors')
    .upsert({
      qb_id: vendor.Id,
      display_name: vendor.DisplayName,
      company_name: vendor.CompanyName,
      email: vendor.PrimaryEmailAddr?.Address,
      phone: vendor.PrimaryPhone?.FreeFormNumber,
      mobile: vendor.Mobile?.FreeFormNumber,
      billing_address: vendor.BillAddr,
      balance: parseFloat(vendor.Balance || '0'),
      taxable: vendor.Taxable || false,
      active: vendor.Active !== false,
      metadata: vendor,
      sync_token: vendor.SyncToken,
      last_synced_at: new Date().toISOString()
    }, {
      onConflict: 'qb_id'
    })
}

/**
 * Get invoice status from QuickBooks invoice data
 */
function getInvoiceStatus(invoice: any): string {
  const balance = parseFloat(invoice.Balance || '0')
  const total = parseFloat(invoice.TotalAmt || '0')

  if (balance === 0) return 'Paid'
  if (balance < total) return 'Partial'

  const dueDate = new Date(invoice.DueDate)
  if (dueDate < new Date()) return 'Overdue'

  if (invoice.EmailStatus === 'EmailSent') return 'Sent'

  return 'Draft'
}
