var assert = require('assert'),
    proxyquire = require('proxyquire'),
    mockCsvRaw;

mockCsvRaw = "Name,Github,Email,Committer,Reviewer\n" +
"Matthew Taylor,rhyolight,matt@numenta.org,1,1\n" +
"Rahul Agarwal,rahul1,ragarwal@numenta.com,1,0\n" +
"Scott Purdy,scottpurdy,scott@numenta.org,1,1\n" +
"Subutai Ahmad,subutai,subutai@numenta.org,1,1\n" +
"Arlo Breault,arlolra,arlolra@gmail.com,0,0\n" +
"Austin Marshall,oxtopus,oxtopus@gmail.com,1,1\n" +
"Ron Marianetti,rmarianetti,rmarianetti@groksolutions.com,1,1\n" +
"Ian Danforth,iandanforth,idanforth@embodiedai.com,0,0\n" +
"Ziv Rosen,zivrosen,zrosen@groksolutions.com,1,0\n" +
"Vitaly Kruglikov,vitaly-krugl,vkruglikov@numenta.com,1,1\n" +
"Brev Patterson,brev,bpatterson@groksolutions.com,0,0\n" +
"Stewart Mackenzie,sjmackenzie,setori88@gmail.com,0,0\n" +
"Matthew O'Connor,mattroid,mattroid@gmail.com,0,0\n" +
"Thomas Yu,tyu-grok,tyu@groksolutions.com,1,0\n" +
"Il Memming Park,memming,memming@gmail.com,0,0\n" +
"Henry Pan,hpan1984,henryjpan@gmail.com,0,0\n" +
"Jordan Dea-Mattson,jordandm,jdm@dea-mattson.com,1,0\n" +
"David Ragazzi,DavidRagazzi,david_ragazzi@hotmail.com,0,0\n" +
"Peter Hunt,petehunt,floydophone@gmail.com,0,0\n" +
"Patrick Higgins,pat-man,patman@cybermesa.com,0,0\n" +
"Erik Blas,ravaa,erik.blas@gmail.com,0,0\n" +
"Bertie Wheen,Duta,wheen.b@gmail.com,0,0\n" +
"Joe Block,unixorn,jpb@groksolutions.com,0,0\n" +
"David Brody,dbrody,dbrody@gmail.com,1,0\n" +
"Will Perkins,willperkins,hello@willperkins.com,0,0\n" +
"Marek Otahal,breznak,markotahal@gmail.com,1,0\n" +
"Christopher Lee Simons,csimons,christopherleesimons@gmail.com,0,0\n" +
"Kenneth Hammett,BubbaRich,rich.hammett@gmail.com,0,0\n" +
"Manish Bhattarai,merolaagi,merolaagi@gmail.com,0,0\n" +
"Alexander Stepanov,sysmaker,alexander.a.stepanov@gmail.com,0,0\n" +
"Ellery Wulczyn,ewulczyn,ewulczyn@groksolutions.com,0,0\n" +
"Craig Collins,KI-VEK,Craig.m.collins@comcast.net,0,0\n" +
"Jared Casner,jcasner,jcasner@gmail.com,0,0\n" +
"Gary Follett,garyfollett,gary@follett.com.au,0,0\n" +
"Fergal Byrne,fergbyrne,fergal.byrne@examsupport.ie,0,0\n" +
"David Petrillo,dpetrillo740,david.petrillo@gmail.com,0,0\n" +
"Gil Shotan,gilsho,gilsho@cs.stanford.edu,0,0\n" +
"Rob de Bliek,rdebliek,rdebliek@gmail.com,0,0\n" +
"Luiz Scheinkman,lscheinkman,lscheinkman@groksolutions.com,0,0\n" +
"Ari Kamlani,akamlani,akamlani@gmail.com,0,0\n" +
"Karthikeyan Subbaraj,karthiks,karthispeaks@gmail.com,0,0\n" +
"Matt Keith,keithcom,keith@keithcom.com,0,0\n" +
"Hideaki Suzuki,h2suzuki,h2suzuki@gmail.com,0,0\n" +
"Paulo Reis Rodrigues,khamael,paulo@mint-labs.com,0,0\n" +
"Mattias Eriksson,mattiaseriksson,eriksson.mattias@gmail.com,0,0\n" +
"Chetan Surpur,chetan51,hetan51@gmail.com,0,0\n" +
"Ramesh Ganesan,info2ram,info2ram@gmail.com,0,0\n" +
"Marc Girardot,mgirardo,mgirardo@cisco.com,0,0\n" +
"Rakesh Kumar,gopchandani,gopchandani@gmail.com,0,0\n" +
"Paolo Gavazzi,pgavazzi,pgavazzi@softcactus.com,0,0\n" +
"Aseem Hegshetye,aseem-hegshetye,axh118830@utdallas.edu,0,0\n" +
"Carl Friess,carlfriess,carl.friess@me.com,0,0\n" +
"Papa Niang,pniang,Opendatageek@gmail.com,0,0\n" +
"Azat Nurmagambetov,azatnur,azat_n@yahoo.com,0,0\n" +
"Sergey Milanov,smilanov,s_milanov@yahoo.com,0,0\n" +
"Aidan Rocke,AidanRocke,aidan.rocke@gmail.com,0,0\n" +
"Timothy McNamara,timClicks,paperless@timmcnamara.co.nz,0,0\n" +
"Zac Kohn,zackohn,zackohn@yahoo.com,0,0\n" +
"Mark Ellul,mark-ellul,mark@iplusd.net,0,0\n" +
"Greg Slepak,taoeffect,contact@taoeffect.com,0,0\n" +
"Max Lapan,shmuma,max.lapan@gmail.com,0,0\n" +
"Wei Wang,tskatom,tskatom@gmail.com,0,0\n" +
"Jason Poovey,sirpoovey,japoovey@gmail.com,0,0\n" +
"Joseph-Anthony Perez,BlueConstellation,joe.perez@gmx.de,0,0\n" +
"Jordan Miller,LegitMiller,jordan.kay@gmail.com,0,0\n" +
"Grant Wright,grant-wright,grant.wright@yahoo.com,0,0\n" +
"Takashi Yamamoto,TakashiYamamoto,takashi@caelum.co.jp,0,0\n" +
"Alexander Powell,alexaltair,alexanderaltair@gmail.com,0,0\n" +
"Timothy Farley,trfarley,t.farley@loma.k12.ca.us,0,0\n" +
"Jacques Ludik,jludik,jludik@gmail.com,0,0\n" +
"Thomas Macrina,macrintr,thomas.macrina@gmail.com,0,0\n" +
"Dominik Lach,asele,pogromcaowiec@student.uksw.edu.pl,0,0\n" +
"Valter Heger,heger-valter,heger.valter@gmail.com,0,0\n" +
"Jeffrey Thompson,jkthompson,jeffreykeatingthompson@gmail.com,0,0\n" +
"Brad Bowman,bowman,brad.bowman@gmail.com,0,0\n";

describe('contributors utilities', function() {
    describe('after fetching CSV data from URL', function() {
        var mockRequestLib = function(url, cb) {
            assert.equal(url, 'url-to-csv', 'wrong csv url used for fetching contributors');
            cb(null, null, mockCsvRaw);
        };
        it('returns proper data structure', function() {
            var contributorsUtils = proxyquire('../../utils/contributors', {
                request: mockRequestLib
            });
            contributorsUtils.getAll('url-to-csv', function(err, contributors) {
                assert(err == undefined, 'received error from csv reader');
                assert.equal(75, contributors.length, 'Bad length of contributors listing');
                var subutai = contributors[3];
                var ian = contributors[7];
                ['Github', 'Name', 'Email'].forEach(function(key) {
                    assert(subutai[key], 'Contributor entry for subutai missing "' + key + '" key');
                    assert(ian[key], 'Contributor entry for ian missing "' + key + '" key');
                });
                assert.equal('Subutai Ahmad', subutai.Name);
                assert.equal('subutai', subutai.Github);
                assert.equal('subutai@numenta.org', subutai.Email);
                assert.equal(1, subutai.Committer, 'Subutai should be a Committer');
                assert.equal(1, subutai.Reviewer, 'Subutai should be a Reviewer');
                assert.equal(0, ian.Committer, 'Ian should not be a Committer');
                assert.equal(0, ian.Reviewer, 'Ian should not be a Reviewer');
            });
        });
    });
});