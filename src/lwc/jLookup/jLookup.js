/* eslint-disable @lwc/lwc/no-async-operation */
import { LightningElement, track, api, wire } from 'lwc'
import findRecords from '@salesforce/apex/JLookupCtrl.findRecords'
import { getObjectInfo } from 'lightning/uiObjectInfoApi'

/** The delay used when debouncing event handlers before invoking Apex. */
const DELAY = 300

export default class JLookup extends LightningElement {

  // attributes
  @api name
  @api objectName
  @api keyFieldApiName
  @api additionalField
  @api autoSelectSingleMatchingRecord = false
  @api lookupLabel
  @api lookupPlaceholder
  @api invalidOptionChosenMessage
  @api isMultiSelect
  @api fixedWhereClause

  // reactive private properties
  @track searchKey = ''
  @track records
  @track error
  @track selectedRecordId
  @track selectedPill
  @track disabledInput
  @track placeholderLabel = "Search"
  @track searchLabel
  @track themeInfo
  @track iconName
  @track items = []

  get comboBoxClass() { return "slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click " + (this.records && this.records.length ? "slds-is-open" : "") }
  get iconClass() { return 'slds-icon_container slds-icon-' + this.iconName.replace(':', '-') + ' slds-pill__icon_container'}
  get iconColor() { return 'background-color: ' + (this.themeInfo && this.themeInfo.color ? ('#' + this.themeInfo.color) : '') + ';' }
  get noRecordFound() { return this.searchKey && (this.records && this.records.length === 0) }
  get showMessage() { return this.selectedRecordId && this.searchKey }
  get displayMultipleOption() { return this.isMultiSelect && this.items }
  get hideInput() { return !this.isMultiSelect && this.selectedRecordId }

  @wire(getObjectInfo, { objectApiName: "$objectName" })
  handleResult({error, data}) {
    if(data) {
      // Get objects information in order to retrieve the icon and label information
      let objectInformation = data
      // If a placeholder has been specified through api use it, otherwise is set as "Search " + <PLURAL_LABEL>
      if(this.lookupPlaceholder) { this.placeholderLabel = this.lookupPlaceholder } 
      else { this.placeholderLabel += " " + (objectInformation && objectInformation.labelPlural ? objectInformation.labelPlural : '') }
      // The same happens for the field label
      this.searchLabel = this.lookupLabel || objectInformation.label
      // Save the theme information (mainly for the icon) and explicitly set the icon name
      this.themeInfo = objectInformation.themeInfo || {}
      if(this.themeInfo && this.themeInfo.iconUrl) {
        const values = this.themeInfo.iconUrl.split('/')
        const n = values.length - 1
        this.iconName = values[n-1] + ':' + values[n].substring(0, values[n].includes('_') ? values[n].indexOf('_') : values[n].indexOf('.'))
      }
      this.validateAttributes(objectInformation)
    }
    if(error) {
      this.showError("You do not have the rights to object or object api name is invalid: " + this.objectName)
      this.disabledInput = true
    }
  }

  // Validate the name and additional fields
  validateAttributes(objectInformation) {
    let fields = objectInformation.fields
    // Convert the fields to map of lower case with regular casing API name
    let fieldsMap = new Map(Object.keys(fields).map(i => [i.toLowerCase(), i]))   
    // Validate if the API name is valid otherwise show and error
    if(this.keyFieldApiName && fieldsMap.has(this.keyFieldApiName.toLowerCase())) {
      // copy proper casing of API name
      this.keyFieldApiName = fieldsMap.get(this.keyFieldApiName.toLowerCase())
    } else {
      this.disabledInput = true
      this.showError("Invalid field api name is passed - " + this.keyFieldApiName)
    }
    if(this.additionalField) {
      // validate the additional field in case its filled in
      if(fieldsMap.has(this.additionalField.toLowerCase())) {
        this.additionalField = fieldsMap.get(this.additionalField.toLowerCase())
      } else {
        this.disabledInput = true
        this.showError("Invalid field api name for additional field is passed - " + this.additionalField)
      }
    }
  }

  handleKeyChange(event) {
    this.setRecordId("")
    // Debouncing this method: Do not update the reactive property as long as this function is
    // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
    window.clearTimeout(this.delayTimeout)
    const searchKey = event.target.value
    this.delayTimeout = setTimeout(() => {
      this.searchKey = searchKey
      this.queryRecords()
    }, DELAY)
  }

  handleBlur(event) {
    // copy the reference of properties locally to make them available for timeout
    let searchKey = event.target.value
    let selectedRecordId = this.selectedRecordId
    let records = this.records
    // timeout is added to avoid showing error when user selects a result
    setTimeout(() => {
      // console.log("before event.target.value", searchKey, selectedRecordId)
      if(this.searchKey) {
        // when single records is available, select it
        if(this.autoSelectSingleMatchingRecord && this.records && this.records.length === 1) {
          this.setRecordId(records[0].Id)
          this.searchKey = records[0].Name
          this.records = []
        }
        // clear out records when user types a keyword, does not select any record and clicks away
        if(!this.selectedRecordId && this.searchKey) {
          this.records = []
        }
        if(this.isMultiSelect) {
          this.searchKey = ''
          this.records = []
        }
        // console.log("inside blur timeout", this.searchKey, this.selectedRecordId)
        this.toggleError()
      }
    }, 200)
  }

  queryRecords() {
    // console.log("you typed: " + this.searchKey)
    var setSelectedRecords = this.isMultiSelect ? this.items.map((item) => item.Id) : []
    // console.log("setSelectedRecords", JSON.stringify(setSelectedRecords))
    findRecords({ 
      'searchKey': this.searchKey,
      'objectApiName': this.objectName,
      'keyField': this.keyFieldApiName,
      'additionalField': this.additionalField,
      'selectedRecords': JSON.stringify(setSelectedRecords),
      'fixedWhereClause': this.fixedWhereClause
    }).then(result => {
      let keyFieldApiName = this.keyFieldApiName
      let additionalField = this.additionalField
      // console.log("this.keyFieldApiName", keyFieldApiName)
      let records = []
      result.forEach(function(eachResult) {
        // prepare the JSON data
        let record = {
          'Id': eachResult.Id,
          'text': eachResult[keyFieldApiName]
        }
        if(additionalField) {
          record.meta = eachResult[additionalField]
        }
        records.push(record)
      })
      this.records = records
      // console.log("this.records", JSON.stringify(this.records))

      this.toggleError()
    }).catch(error => {
        this.error = error
    })
  }

  toggleError() {
    let message = !this.selectedRecordId && this.searchKey && (this.records && this.records.length === 0) ? (this.invalidOptionChosenMessage || 'An invalid option has been chosen.') : ''
    this.showError(message)
  }

  showError(message) {
    let searchInput = this.template.querySelector('.searchInput')
    searchInput.setCustomValidity(message)
    searchInput.reportValidity()
  }

  onResultClick(event) {
    this.setRecordId(event.currentTarget.dataset.recordId)
    if(!this.isMultiSelect) {
      // todo: do something about it, need to fix the text not meta
      let searchKeyword = ''
      if(this.selectedRecordId) {
        let record = this.records.find(eachRecord => eachRecord.Id === this.selectedRecordId)
        if(record && record.Id) {
          searchKeyword = record.text
        }
      }
      this.searchKey = searchKeyword
    }
    // console.log("selectedRecordId", this.selectedRecordId)
    this.records = []
    this.template.querySelector('.searchInput').focus()
  }

  setRecordId(recordId) {
    if(this.selectedRecordId !== recordId) {
      this.searchKey = recordId
      this.selectedRecordId = recordId
      let record = {}
      if(this.records) { record = this.records.find(c => c.Id === recordId) || {} }
      if(this.selectedRecordId && record) { 
        this.items.push(record) 
        this.selectedPill = {
          type: 'icon',
          label: record.text,
          name: record.Id,
          iconName: this.iconName,
          alternativeText: this.objectName
        }
      }

      const searchKeyword = this.selectedRecordId ? record.text : ''
      const eventData = {'detail': { 'record': record, 'searchKey': searchKeyword, 'name': this.name }}
      const selectedEvent = new CustomEvent('selected', eventData)
      // console.log("sending event", JSON.stringify(eventData))
      this.dispatchEvent(selectedEvent)
    }
  }

  handleItemRemove(event) {
    // clear record selected message
    this.setRecordId('')
    const index = event.detail.index ? event.detail.index : event.detail.name
    const _item = this.items
    _item.splice(index, 1)
    // shallow copy of the variable to track
    this.items = [..._item]
  }

  handleSingleItemRemove() {
    // clear record selected message
    this.setRecordId('')
  }
}