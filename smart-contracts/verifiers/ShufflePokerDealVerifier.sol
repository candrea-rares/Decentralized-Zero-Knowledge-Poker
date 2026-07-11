// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract ShufflePokerDealVerifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 13237891615597633660064331823910260982208266602100840013544620743948718740073;
    uint256 constant alphay  = 17060834212843695386326209713751770812764168259657780460111906687257741291566;
    uint256 constant betax1  = 21180159771200976890110048749491590096412317766614486057635435519838323698593;
    uint256 constant betax2  = 7476425783653501160717788589032812523692345205694274964375127148059013875293;
    uint256 constant betay1  = 18260968190708079477327689792479393868956880745699416688559151606698996115362;
    uint256 constant betay2  = 1404463768131939364840294687723367578745442622585702525969363331274134983689;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 13216189160604683911890000879029896709016037666690099727452109644403885622263;
    uint256 constant deltax2 = 21864666681225908678150109288651168932595776893870216036856705172671869505;
    uint256 constant deltay1 = 3549852823763853638241066701076173072345115292075855686998688248413340656551;
    uint256 constant deltay2 = 21167246189697317480285138325867639535238763380809256848077529491262804540338;

    
    uint256 constant IC0x = 1616000575694360937352477058075612120970544660260572179325620760515406759311;
    uint256 constant IC0y = 10230060448315376206574480469950770171156222528020388227229342502990858970876;
    
    uint256 constant IC1x = 8012676304325130304385606746489603880188345185031816045700977421482737775314;
    uint256 constant IC1y = 12223846372065277862248251948750699262658333921667210582496770391332322895247;
    
    uint256 constant IC2x = 16515671508326352949163459840034304626406504317160741075984575685746062809246;
    uint256 constant IC2y = 21868376471495451814208861737905300416931896649708552010637378086835246083378;
    
    uint256 constant IC3x = 1454183695343954697889310655901618539978435649785312512929548719487451836702;
    uint256 constant IC3y = 2589963647107597127273019249615865515883270053379541732788791387282497068988;
    
    uint256 constant IC4x = 1490703561700712829093637995089181240593002695378553486133798595475311323909;
    uint256 constant IC4y = 11748390282183678990536905250949202686842416392849251379816070840478752268039;
    
    uint256 constant IC5x = 13768512983036716221257543707540178872192765874668508927117728564454987994156;
    uint256 constant IC5y = 4347096899551275638360311912649442644528123390543872831649881703664244206971;
    
    uint256 constant IC6x = 4233249636054000890331342352416795256041656274642411177787674321556614866442;
    uint256 constant IC6y = 6779964024068303873248112879543181069172784663683507112361072407976546915516;
    
    uint256 constant IC7x = 10647460195095885035694730436520960445115132261803219841091903121366327685643;
    uint256 constant IC7y = 4499593793604484861636340008141940468610764588498361102480772456313453290485;
    
    uint256 constant IC8x = 9207309814801123659852883792897518342699133153928499190713447051303565808147;
    uint256 constant IC8y = 13696773026165393351826645781550213419661037064351805546995955360628596697764;
    
    uint256 constant IC9x = 2952964628361461375757911204132056866062516769180635446875728635593945231414;
    uint256 constant IC9y = 945632277896620104293498006931920385778038604226267008289873856713146378574;
    
    uint256 constant IC10x = 785071126503969259109529530020842910410748891418251256822969896688094992838;
    uint256 constant IC10y = 18618212999971469589173833694583205317624064578029617850586708283300868024957;
    
    uint256 constant IC11x = 20146066736141786594851725678116604806464877093907642339338080462760439820391;
    uint256 constant IC11y = 5316179545768658742616981429831867436694339485744881734002689352675935702230;
    
    uint256 constant IC12x = 1044924605409750863580818675283302199634436930835367374967180852217881372202;
    uint256 constant IC12y = 2539392226738291992911832557638352368398045472162104891643995414417422337323;
    
    uint256 constant IC13x = 1221322163773942714944442216171783868844014337456761304246918341118866984997;
    uint256 constant IC13y = 3745134641782155753755612025882375156321997183722420993878701868200016908305;
    
    uint256 constant IC14x = 2148713005603854786200158701901445858623656761995651831842694917570465835572;
    uint256 constant IC14y = 19258736988419892318991300305944389489591465117838820871716612357136381810226;
    
    uint256 constant IC15x = 162345966625308373349518458710697564152236510389205939816200750319732066018;
    uint256 constant IC15y = 1593181406913071493105958348750025836082216793970014906588655769901006853471;
    
    uint256 constant IC16x = 19279201280990915208135280849064981037682674981509902922745524309688696700634;
    uint256 constant IC16y = 21561863676800924429957935267200511587175626569424968935550575820641495958153;
    
    uint256 constant IC17x = 11018936179948428024590507299911618515451797755757885541001448505553540537402;
    uint256 constant IC17y = 8283530133049844623738915114715300224317491181967101304215867424187099755875;
    
    uint256 constant IC18x = 1405826150657478721883822341852470373178866336453984892038026358118182672419;
    uint256 constant IC18y = 3757680021880569399038477079458621526067602737206632336384028777213158487040;
    
    uint256 constant IC19x = 21547363369790932738489625842362524286810878499947412656661656721383104011248;
    uint256 constant IC19y = 16118122228485683592404805519195523351286579013630992810433840297759339512506;
    
    uint256 constant IC20x = 13249120021579241241470029797325144914315652159905554236050693814607910011616;
    uint256 constant IC20y = 11375941931069661549202059385320351805838717835975223749756170524327053878437;
    
    uint256 constant IC21x = 19761290073363836721893539090405700737151187287839458345855583625626472345730;
    uint256 constant IC21y = 11475417322791702661849438586109345285692591413895042673306129557461621405347;
    
    uint256 constant IC22x = 16312025629181257107497765838710405831210313377121909362348538167959400201625;
    uint256 constant IC22y = 20432460038311103730638838174279358838462890418419906099935155765382323038902;
    
    uint256 constant IC23x = 3211167316090662197404118641157912199275752610311318504714848355852623785472;
    uint256 constant IC23y = 2117765560710110800858453599453395405826718262559960313303508801273390533008;
    
    uint256 constant IC24x = 10010959713906932464539117764266705564983145441304156980442759720387102361104;
    uint256 constant IC24y = 3333165311488881598458181761447555978506095992581833379700742930086731221695;
    
    uint256 constant IC25x = 1858557069162173435824534541173512994256692843174194515436874850359815798831;
    uint256 constant IC25y = 9075804822372732061392182126825757513488008433677678002597313664902965502820;
    
    uint256 constant IC26x = 13524281193669920367278523554908835769716783746135665133692436912902342691081;
    uint256 constant IC26y = 15298303226044049366646221617456528001269498887766463322090004127939859401982;
    
    uint256 constant IC27x = 19951860522891152825915015972719913951602402245688878556116840322527901485500;
    uint256 constant IC27y = 18510345007736318401461594185453234694740535423248514778768870105956293813979;
    
    uint256 constant IC28x = 176828861114139389982516671827266513916346720514899062325679889434354782479;
    uint256 constant IC28y = 6060288725309253000501244133274641269537203774594131559679189246035043829932;
    
    uint256 constant IC29x = 4114276583931228489631488638959079038957388968548231388257775239096569241322;
    uint256 constant IC29y = 10528680253118075646468069029480096071617793086675184177598356271682229848596;
    
    uint256 constant IC30x = 4457114938955246978537694297341852861199879961984181653324988914027863344011;
    uint256 constant IC30y = 9016283263527385007310360780423345234984161375832455357396973225477158641195;
    
    uint256 constant IC31x = 3136793689155318174687680934923424568685701346712336533001992736295274312528;
    uint256 constant IC31y = 12879702455969227915527509410433609208310303398308263878211178091143752724612;
    
    uint256 constant IC32x = 21566808067073951333766801525105012201086209311464371748204646665987037441427;
    uint256 constant IC32y = 17106258037105117362880676711460029647243474751105573583658680267947939572655;
    
    uint256 constant IC33x = 12025167257586460258319705164632826193400565893799350723714495786672439771719;
    uint256 constant IC33y = 13206316885067220232232303466505853471326100755954312618160534594700424509601;
    
    uint256 constant IC34x = 12556177368516758147336115337407462664537672516475054006587186046427125297963;
    uint256 constant IC34y = 16017480232696645138997628351652753383812271901054299744738682976243175263954;
    
    uint256 constant IC35x = 14982540767725984539518301248505230541578972930957220854670504833448536207886;
    uint256 constant IC35y = 5181253736278469640706633958798977331534093224503168368065831677662934452796;
    
    uint256 constant IC36x = 10848213858762152902856376168545798681093136811293714391061019042846697315925;
    uint256 constant IC36y = 17477391911463040102560892055493157208079397400127928268839775830228723867023;
    
    uint256 constant IC37x = 21704293399925690357454669706099224279115514640303532963875467242566871373249;
    uint256 constant IC37y = 12962041200920953275030609949696957135691882299463570958759020090758974478940;
    
    uint256 constant IC38x = 10664809285166940289973019972815151759002759032419498034722088328995742944852;
    uint256 constant IC38y = 21413288245761238040532179024691738761255543450869847420449854488475207359370;
    
    uint256 constant IC39x = 1264045704850585122679994137411106551865172928794189414091284569908938637589;
    uint256 constant IC39y = 14891122946171780225394164204496202875856139743415598535866362268248795613970;
    
    uint256 constant IC40x = 5706575214449700962774400081202515371807277758348287364322266152958541376689;
    uint256 constant IC40y = 452253142721220525340916387580543932801501646249040794146957093730379302894;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[40] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                
                g1_mulAccC(_pVk, IC17x, IC17y, calldataload(add(pubSignals, 512)))
                
                g1_mulAccC(_pVk, IC18x, IC18y, calldataload(add(pubSignals, 544)))
                
                g1_mulAccC(_pVk, IC19x, IC19y, calldataload(add(pubSignals, 576)))
                
                g1_mulAccC(_pVk, IC20x, IC20y, calldataload(add(pubSignals, 608)))
                
                g1_mulAccC(_pVk, IC21x, IC21y, calldataload(add(pubSignals, 640)))
                
                g1_mulAccC(_pVk, IC22x, IC22y, calldataload(add(pubSignals, 672)))
                
                g1_mulAccC(_pVk, IC23x, IC23y, calldataload(add(pubSignals, 704)))
                
                g1_mulAccC(_pVk, IC24x, IC24y, calldataload(add(pubSignals, 736)))
                
                g1_mulAccC(_pVk, IC25x, IC25y, calldataload(add(pubSignals, 768)))
                
                g1_mulAccC(_pVk, IC26x, IC26y, calldataload(add(pubSignals, 800)))
                
                g1_mulAccC(_pVk, IC27x, IC27y, calldataload(add(pubSignals, 832)))
                
                g1_mulAccC(_pVk, IC28x, IC28y, calldataload(add(pubSignals, 864)))
                
                g1_mulAccC(_pVk, IC29x, IC29y, calldataload(add(pubSignals, 896)))
                
                g1_mulAccC(_pVk, IC30x, IC30y, calldataload(add(pubSignals, 928)))
                
                g1_mulAccC(_pVk, IC31x, IC31y, calldataload(add(pubSignals, 960)))
                
                g1_mulAccC(_pVk, IC32x, IC32y, calldataload(add(pubSignals, 992)))
                
                g1_mulAccC(_pVk, IC33x, IC33y, calldataload(add(pubSignals, 1024)))
                
                g1_mulAccC(_pVk, IC34x, IC34y, calldataload(add(pubSignals, 1056)))
                
                g1_mulAccC(_pVk, IC35x, IC35y, calldataload(add(pubSignals, 1088)))
                
                g1_mulAccC(_pVk, IC36x, IC36y, calldataload(add(pubSignals, 1120)))
                
                g1_mulAccC(_pVk, IC37x, IC37y, calldataload(add(pubSignals, 1152)))
                
                g1_mulAccC(_pVk, IC38x, IC38y, calldataload(add(pubSignals, 1184)))
                
                g1_mulAccC(_pVk, IC39x, IC39y, calldataload(add(pubSignals, 1216)))
                
                g1_mulAccC(_pVk, IC40x, IC40y, calldataload(add(pubSignals, 1248)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            
            checkField(calldataload(add(_pubSignals, 512)))
            
            checkField(calldataload(add(_pubSignals, 544)))
            
            checkField(calldataload(add(_pubSignals, 576)))
            
            checkField(calldataload(add(_pubSignals, 608)))
            
            checkField(calldataload(add(_pubSignals, 640)))
            
            checkField(calldataload(add(_pubSignals, 672)))
            
            checkField(calldataload(add(_pubSignals, 704)))
            
            checkField(calldataload(add(_pubSignals, 736)))
            
            checkField(calldataload(add(_pubSignals, 768)))
            
            checkField(calldataload(add(_pubSignals, 800)))
            
            checkField(calldataload(add(_pubSignals, 832)))
            
            checkField(calldataload(add(_pubSignals, 864)))
            
            checkField(calldataload(add(_pubSignals, 896)))
            
            checkField(calldataload(add(_pubSignals, 928)))
            
            checkField(calldataload(add(_pubSignals, 960)))
            
            checkField(calldataload(add(_pubSignals, 992)))
            
            checkField(calldataload(add(_pubSignals, 1024)))
            
            checkField(calldataload(add(_pubSignals, 1056)))
            
            checkField(calldataload(add(_pubSignals, 1088)))
            
            checkField(calldataload(add(_pubSignals, 1120)))
            
            checkField(calldataload(add(_pubSignals, 1152)))
            
            checkField(calldataload(add(_pubSignals, 1184)))
            
            checkField(calldataload(add(_pubSignals, 1216)))
            
            checkField(calldataload(add(_pubSignals, 1248)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
