// Originally taken from here: https://github.com/forcetrekker/lwc-lookup/

public with sharing class JLookupCtrl {

  @AuraEnabled(cacheable=true)
  public static List<SObject> findRecords(String searchKey, String objectApiName, String keyField, String additionalField, String selectedRecords, String fixedWhereClause) {
    List<SObject> records =  new List<SObject>();
    // If there no key return the empty list
    if(String.isEmpty(searchKey)) { return records; }
    
    // The Id field is always retrieved, than the key field and the eventual additionalField
    Set<String> fieldsSet = new Set<String>{'Id', keyField};
    if(String.isNotEmpty(additionalField)) { fieldsSet.add(additionalField); }
    String fieldsString = String.join(new List<String>(fieldsSet), ', ');
    
    // Setup the wehere clause
    String whereClause = 'WHERE ' + keyField + ' LIKE \'%'+ searchKey +'%\'';
    if(String.isNotEmpty(selectedRecords)){
      Set<Id> setSelectedRecords = (Set<Id>) JSON.deserialize(selectedRecords, Set<Id>.class);
      if(!setSelectedRecords.isEmpty()) { whereClause += ' AND Id NOT IN: setSelectedRecords'; }
    }
    if(String.isNotEmpty(fixedWhereClause)) { whereClause += ' AND ' + fixedWhereClause; }

    // Prepare the soql and get the records
    String soql = 'SELECT ' + fieldsString + ' FROM ' + objectApiName + ' ' + whereClause + ' ORDER BY ' + keyField + ' LIMIT 10';
    records = Database.query(soql);
    return records;
  }
}