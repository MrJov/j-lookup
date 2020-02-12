@isTest
private class JLookupCtrlTest {
  @TestSetup
  static void makeData(){
    List<Account> accounts = new List<Account>();
    accounts.add(new Account(Name = 'Iron Man'));
    accounts.add(new Account(Name = 'Iron Heart'));
    accounts.add(new Account(Name = 'Superman'));
    accounts.add(new Account(Name = 'Batman'));
    accounts.add(new Account(Name = 'Robin Hood'));
    accounts.add(new Account(Name = 'Capitan America'));
    insert accounts;
  }

  @IsTest
  static void testFindRecords(){
    
    Test.startTest();
    List<SObject> noResult = JLookupCtrl.findRecords('Hulk', 'Account', 'Name', null, null, null);
    List<SObject> noKey = JLookupCtrl.findRecords('', 'Contact', 'Name', 'Role', null, null);
    List<SObject> results = JLookupCtrl.findRecords('Man', 'Account', 'Name', 'Type', null, null);
    Set<Id> idsToExclude = new Set<Id>{ (Id)results[0].get('Id') };
    List<SObject> resultsExcluded = JLookupCtrl.findRecords('Man', 'Account', 'Name', 'Type', JSON.serialize(idsToExclude), null);
    List<SObject> noResultWhere = JLookupCtrl.findRecords('man', 'Account', 'Name', 'Type', null, 'Type != \'\'');
    Test.stopTest();

    System.assertEquals(0, noResult.size());
    System.assertEquals(0, noKey.size());
    System.assertEquals(3, results.size());
    System.assertEquals(2, resultsExcluded.size());
    System.assertEquals(0, noResultWhere.size());
    
  }
}